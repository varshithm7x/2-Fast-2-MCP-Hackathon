// ============================================================================
// Procrastination Shame Engine - Task Tracker Service
// Integrates with Todoist, Notion, Linear, Jira to fetch tasks
// ============================================================================

import {
  TaskPriority,
  TaskStatus,
  type TrackedTask,
} from "../types.js";
import { generateId, now } from "../utils/helpers.js";

/** In-memory task store (aggregated from all sources) */
const tasks: Map<string, TrackedTask> = new Map();

// ---- Todoist Integration ----

interface TodoistTask {
  id: string;
  content: string;
  description: string;
  priority: number; // 1=low, 4=urgent in Todoist
  due?: { date: string; datetime?: string } | null;
  checked: boolean;
  project_id: string;
  labels: string[];
  added_at: string;
  completed_at?: string | null;
}

interface TodoistPaginatedResponse {
  results: TodoistTask[];
  next_cursor: string | null;
}

interface TodoistCompletedResponse {
  items: TodoistTask[];
  next_cursor: string | null;
}

function mapTodoistTaskToTracked(t: TodoistTask): TrackedTask {
  return {
    id: `todoist-${t.id}`,
    title: t.content,
    description: t.description,
    source: "todoist" as const,
    priority: mapTodoistPriority(t.priority),
    status: t.checked ? TaskStatus.DONE : determineStatus(t.due?.datetime || t.due?.date),
    dueDate: t.due?.datetime ? new Date(t.due.datetime) : t.due?.date ? new Date(t.due.date) : undefined,
    createdAt: new Date(t.added_at),
    updatedAt: t.completed_at ? new Date(t.completed_at) : new Date(),
    tags: t.labels,
  };
}

export async function fetchTodoistTasks(apiKey: string): Promise<TrackedTask[]> {
  try {
    const allTasks: TodoistTask[] = [];

    // 1. Fetch active (uncompleted) tasks
    let cursor: string | null = null;
    do {
      const url = new URL("https://api.todoist.com/api/v1/tasks");
      url.searchParams.set("limit", "200");
      if (cursor) url.searchParams.set("cursor", cursor);

      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      if (!response.ok) {
        console.error(`Todoist API error (active tasks): ${response.status}`);
        break;
      }

      const data = (await response.json()) as TodoistPaginatedResponse;
      allTasks.push(...data.results);
      cursor = data.next_cursor;
    } while (cursor);

    // 2. Fetch recently completed tasks (last 30 days)
    const since = new Date();
    since.setDate(since.getDate() - 30);
    cursor = null;
    do {
      const url = new URL("https://api.todoist.com/api/v1/tasks/completed/by_completion_date");
      url.searchParams.set("since", since.toISOString());
      url.searchParams.set("until", new Date().toISOString());
      url.searchParams.set("limit", "200");
      if (cursor) url.searchParams.set("cursor", cursor);

      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      if (!response.ok) {
        console.error(`Todoist API error (completed tasks): ${response.status}`);
        break;
      }

      const data = (await response.json()) as TodoistCompletedResponse;
      allTasks.push(...data.items);
      cursor = data.next_cursor;
    } while (cursor);

    console.log(`[Todoist] Fetched ${allTasks.length} tasks (active + completed)`);
    return allTasks.map(mapTodoistTaskToTracked);
  } catch (error) {
    console.error("Failed to fetch Todoist tasks:", error);
    return [];
  }
}

function mapTodoistPriority(p: number): TaskPriority {
  switch (p) {
    case 4: return TaskPriority.P0_CRITICAL;
    case 3: return TaskPriority.P1_HIGH;
    case 2: return TaskPriority.P2_MEDIUM;
    default: return TaskPriority.P3_LOW;
  }
}

// ---- Notion Integration ----

export async function fetchNotionTasks(
  apiKey: string,
  databaseId: string
): Promise<TrackedTask[]> {
  try {
    const response = await fetch(
      `https://api.notion.com/v1/databases/${databaseId}/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filter: {
            property: "Status",
            status: { does_not_equal: "Done" },
          },
        }),
      }
    );

    if (!response.ok) {
      console.error(`Notion API error: ${response.status}`);
      return [];
    }

    const data = (await response.json()) as any;
    return (data.results || []).map((page: any) => ({
      id: `notion-${page.id}`,
      title: extractNotionTitle(page),
      source: "notion" as const,
      priority: extractNotionPriority(page),
      status: extractNotionStatus(page),
      dueDate: extractNotionDate(page),
      createdAt: new Date(page.created_time),
      updatedAt: new Date(page.last_edited_time),
    }));
  } catch (error) {
    console.error("Failed to fetch Notion tasks:", error);
    return [];
  }
}

function extractNotionTitle(page: any): string {
  const titleProp = Object.values(page.properties || {}).find(
    (p: any) => p.type === "title"
  ) as any;
  return titleProp?.title?.[0]?.plain_text || "Untitled";
}

function extractNotionPriority(page: any): TaskPriority {
  const priorityProp = page.properties?.Priority;
  if (!priorityProp) return TaskPriority.P2_MEDIUM;
  const value = priorityProp.select?.name?.toLowerCase() || "";
  if (value.includes("critical") || value.includes("p0")) return TaskPriority.P0_CRITICAL;
  if (value.includes("high") || value.includes("p1")) return TaskPriority.P1_HIGH;
  if (value.includes("low") || value.includes("p3")) return TaskPriority.P3_LOW;
  return TaskPriority.P2_MEDIUM;
}

function extractNotionStatus(page: any): TaskStatus {
  const statusProp = page.properties?.Status;
  const value = statusProp?.status?.name?.toLowerCase() || "";
  if (value.includes("done") || value.includes("complete")) return TaskStatus.DONE;
  if (value.includes("progress") || value.includes("doing")) return TaskStatus.IN_PROGRESS;
  return TaskStatus.TODO;
}

function extractNotionDate(page: any): Date | undefined {
  const dateProp = page.properties?.["Due Date"] || page.properties?.Due;
  if (dateProp?.date?.start) return new Date(dateProp.date.start);
  return undefined;
}

// ---- Linear Integration ----

export async function fetchLinearTasks(apiKey: string): Promise<TrackedTask[]> {
  try {
    const response = await fetch("https://api.linear.app/graphql", {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `{
          issues(filter: { assignedToMe: { eq: true }, state: { type: { nin: ["completed", "canceled"] } } }) {
            nodes {
              id
              title
              description
              priority
              dueDate
              state { name }
              labels { nodes { name } }
              createdAt
              updatedAt
            }
          }
        }`,
      }),
    });

    if (!response.ok) return [];

    const data = (await response.json()) as any;
    return (data.data?.issues?.nodes || []).map((issue: any) => ({
      id: `linear-${issue.id}`,
      title: issue.title,
      description: issue.description,
      source: "linear" as const,
      priority: mapLinearPriority(issue.priority),
      status: mapLinearStatus(issue.state?.name),
      dueDate: issue.dueDate ? new Date(issue.dueDate) : undefined,
      createdAt: new Date(issue.createdAt),
      updatedAt: new Date(issue.updatedAt),
      tags: issue.labels?.nodes?.map((l: any) => l.name) || [],
    }));
  } catch (error) {
    console.error("Failed to fetch Linear issues:", error);
    return [];
  }
}

function mapLinearPriority(p: number): TaskPriority {
  switch (p) {
    case 1: return TaskPriority.P0_CRITICAL;
    case 2: return TaskPriority.P1_HIGH;
    case 3: return TaskPriority.P2_MEDIUM;
    default: return TaskPriority.P3_LOW;
  }
}

function mapLinearStatus(state: string): TaskStatus {
  const s = (state || "").toLowerCase();
  if (s.includes("done") || s.includes("complete")) return TaskStatus.DONE;
  if (s.includes("progress") || s.includes("started")) return TaskStatus.IN_PROGRESS;
  return TaskStatus.TODO;
}

// ---- Jira Integration ----

export async function fetchJiraTasks(
  apiKey: string,
  projectKey: string
): Promise<TrackedTask[]> {
  try {
    const domain = process.env.JIRA_DOMAIN || "your-domain.atlassian.net";
    const email = process.env.JIRA_EMAIL || "";
    const auth = Buffer.from(`${email}:${apiKey}`).toString("base64");

    const jql = encodeURIComponent(
      `project = ${projectKey} AND assignee = currentUser() AND status != Done ORDER BY priority DESC`
    );

    const response = await fetch(
      `https://${domain}/rest/api/3/search?jql=${jql}&maxResults=50`,
      {
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) return [];

    const data = (await response.json()) as any;
    return (data.issues || []).map((issue: any) => ({
      id: `jira-${issue.key}`,
      title: `[${issue.key}] ${issue.fields?.summary || "Untitled"}`,
      description: issue.fields?.description?.content?.[0]?.content?.[0]?.text,
      source: "jira" as const,
      priority: mapJiraPriority(issue.fields?.priority?.name),
      status: mapJiraStatus(issue.fields?.status?.name),
      dueDate: issue.fields?.duedate ? new Date(issue.fields.duedate) : undefined,
      createdAt: new Date(issue.fields?.created || Date.now()),
      updatedAt: new Date(issue.fields?.updated || Date.now()),
      tags: issue.fields?.labels || [],
      projectName: projectKey,
    }));
  } catch (error) {
    console.error("Failed to fetch Jira issues:", error);
    return [];
  }
}

function mapJiraPriority(name: string): TaskPriority {
  const p = (name || "").toLowerCase();
  if (p.includes("highest") || p.includes("blocker")) return TaskPriority.P0_CRITICAL;
  if (p.includes("high")) return TaskPriority.P1_HIGH;
  if (p.includes("low") || p.includes("lowest")) return TaskPriority.P3_LOW;
  return TaskPriority.P2_MEDIUM;
}

function mapJiraStatus(name: string): TaskStatus {
  const s = (name || "").toLowerCase();
  if (s.includes("done") || s.includes("resolved") || s.includes("closed")) return TaskStatus.DONE;
  if (s.includes("progress")) return TaskStatus.IN_PROGRESS;
  return TaskStatus.TODO;
}

// ---- General Helpers ----

function determineStatus(dueDateStr?: string): TaskStatus {
  if (!dueDateStr) return TaskStatus.TODO;
  const dueDate = new Date(dueDateStr);
  if (dueDate < new Date()) return TaskStatus.OVERDUE;
  return TaskStatus.TODO;
}

// ---- Manual Task Management ----

export function addManualTask(
  title: string,
  priority: TaskPriority = TaskPriority.P2_MEDIUM,
  dueDate?: string
): TrackedTask {
  const task: TrackedTask = {
    id: `manual-${generateId()}`,
    title,
    source: "manual",
    priority,
    status: TaskStatus.TODO,
    dueDate: dueDate ? new Date(dueDate) : undefined,
    createdAt: now(),
    updatedAt: now(),
  };
  tasks.set(task.id, task);
  return task;
}

export function completeTask(taskId: string): TrackedTask | null {
  const task = tasks.get(taskId);
  if (!task) return null;
  task.status = TaskStatus.DONE;
  task.updatedAt = now();
  return task;
}

export function getAllTasks(): TrackedTask[] {
  return Array.from(tasks.values());
}

export function updateTaskStore(newTasks: TrackedTask[]): void {
  for (const task of newTasks) {
    tasks.set(task.id, task);
  }
}

/** Fetch tasks from all configured sources */
export async function fetchAllTasks(
  sources: Array<{ type: string; apiKey?: string; projectId?: string }>
): Promise<TrackedTask[]> {
  const allTasks: TrackedTask[] = [];

  for (const source of sources) {
    if (!source.apiKey) continue;

    switch (source.type) {
      case "todoist":
        allTasks.push(...(await fetchTodoistTasks(source.apiKey)));
        break;
      case "notion":
        if (source.projectId) {
          allTasks.push(...(await fetchNotionTasks(source.apiKey, source.projectId)));
        }
        break;
      case "linear":
        allTasks.push(...(await fetchLinearTasks(source.apiKey)));
        break;
      case "jira":
        if (source.projectId) {
          allTasks.push(...(await fetchJiraTasks(source.apiKey, source.projectId)));
        }
        break;
    }
  }

  // Also include manual tasks
  allTasks.push(...getAllTasks());

  // Deduplicate by ID
  const uniqueTasks = new Map<string, TrackedTask>();
  for (const task of allTasks) {
    uniqueTasks.set(task.id, task);
  }

  // Update the store
  updateTaskStore(Array.from(uniqueTasks.values()));

  return Array.from(uniqueTasks.values());
}
