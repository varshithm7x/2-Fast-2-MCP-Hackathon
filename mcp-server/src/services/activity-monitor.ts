// ============================================================================
// Procrastination Shame Engine - Activity Monitor Service
// Tracks what users are actually doing via GitHub, browser, time tracking
// ============================================================================

import { ActivityCategory, type UserActivity } from "../types.js";
import { categorizeActivity } from "../utils/categories.js";
import { generateId, now } from "../utils/helpers.js";
import { detectActivityState, type ActivityStatus } from "../utils/linux-activity.js";

/** In-memory activity log */
const activityLog: UserActivity[] = [];

/** Context switch counter (resets hourly) */
let contextSwitchCount = 0;
let lastContextSwitchReset = Date.now();
let lastAppOrUrl: string | null = null;

// ---- GitHub Activity Tracking ----

interface GitHubEvent {
  id: string;
  type: string;
  created_at: string;
  repo: { name: string };
  payload: any;
}

export async function fetchGitHubActivity(token: string): Promise<UserActivity[]> {
  try {
    // Get authenticated user
    const userRes = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${token}`, "User-Agent": "ProcrastinationShameEngine" },
    });
    if (!userRes.ok) return [];
    const user = (await userRes.json()) as { login: string };

    // Get recent events
    const eventsRes = await fetch(
      `https://api.github.com/users/${user.login}/events?per_page=30`,
      {
        headers: { Authorization: `Bearer ${token}`, "User-Agent": "ProcrastinationShameEngine" },
      }
    );
    if (!eventsRes.ok) return [];
    const events: GitHubEvent[] = (await eventsRes.json()) as GitHubEvent[];

    // Convert to activities
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return events
      .filter((e) => new Date(e.created_at) >= today)
      .map((e) => ({
        id: `github-${e.id}`,
        timestamp: new Date(e.created_at),
        durationMinutes: estimateGitHubDuration(e.type),
        source: "git" as const,
        category: ActivityCategory.PRODUCTIVE,
        title: formatGitHubEvent(e),
        description: `${e.type} on ${e.repo.name}`,
        evidence: { type: e.type, repo: e.repo.name },
      }));
  } catch (error) {
    console.error("Failed to fetch GitHub activity:", error);
    return [];
  }
}

function estimateGitHubDuration(eventType: string): number {
  switch (eventType) {
    case "PushEvent": return 30;
    case "PullRequestEvent": return 45;
    case "PullRequestReviewEvent": return 20;
    case "IssuesEvent": return 10;
    case "IssueCommentEvent": return 5;
    case "CreateEvent": return 15;
    case "DeleteEvent": return 2;
    default: return 10;
  }
}

function formatGitHubEvent(event: GitHubEvent): string {
  switch (event.type) {
    case "PushEvent": {
      const commits = event.payload?.commits?.length || 0;
      return `Pushed ${commits} commit${commits !== 1 ? "s" : ""} to ${event.repo.name}`;
    }
    case "PullRequestEvent":
      return `${event.payload?.action || "updated"} PR on ${event.repo.name}`;
    case "PullRequestReviewEvent":
      return `Reviewed PR on ${event.repo.name}`;
    case "IssuesEvent":
      return `${event.payload?.action || "updated"} issue on ${event.repo.name}`;
    case "IssueCommentEvent":
      return `Commented on issue in ${event.repo.name}`;
    default:
      return `${event.type} on ${event.repo.name}`;
  }
}

// ---- RescueTime Integration ----

export async function fetchRescueTimeActivity(apiKey: string): Promise<UserActivity[]> {
  try {
    const today = new Date().toISOString().split("T")[0];
    const response = await fetch(
      `https://www.rescuetime.com/anapi/data?key=${apiKey}&format=json&perspective=interval&restrict_kind=activity&restrict_begin=${today}&restrict_end=${today}`,
    );

    if (!response.ok) return [];

    const data = (await response.json()) as { rows?: any[] };
    return (data.rows || []).map((row: any[]) => {
      const activityName = row[3] || "Unknown";
      const category = categorizeActivity(activityName);
      return {
        id: `rescuetime-${generateId()}`,
        timestamp: new Date(row[0]),
        durationMinutes: Math.round((row[1] || 0) / 60),
        source: "time_tracker" as const,
        category,
        title: activityName,
        description: `${row[4] || "General"} - ${row[3] || "Unknown"}`,
        evidence: { seconds: row[1], productivity: row[5] },
      };
    });
  } catch (error) {
    console.error("Failed to fetch RescueTime activity:", error);
    return [];
  }
}

// ---- Toggl Integration ----

export async function fetchTogglActivity(apiKey: string): Promise<UserActivity[]> {
  try {
    const auth = Buffer.from(`${apiKey}:api_token`).toString("base64");
    const response = await fetch(
      "https://api.track.toggl.com/api/v9/me/time_entries/current",
      {
        headers: { Authorization: `Basic ${auth}` },
      }
    );

    if (!response.ok) return [];

    const entry = (await response.json()) as any;
    if (!entry || !entry.id) return [];

    const startTime = new Date(entry.start);
    const duration = (Date.now() - startTime.getTime()) / 60000;

    const category = categorizeActivity(entry.description || "");

    return [
      {
        id: `toggl-${entry.id}`,
        timestamp: startTime,
        durationMinutes: Math.round(duration),
        source: "time_tracker" as const,
        category,
        title: entry.description || "Untracked Time",
        description: `Toggl: ${entry.description || "No description"}`,
        evidence: { togglId: entry.id, project: entry.project_id },
      },
    ];
  } catch (error) {
    console.error("Failed to fetch Toggl activity:", error);
    return [];
  }
}

// ---- Manual Activity Logging ----

export function logActivity(
  title: string,
  durationMinutes: number,
  source: UserActivity["source"] = "manual",
  url?: string,
  appName?: string
): UserActivity {
  const input = url || appName || title;
  const category = categorizeActivity(input);

  const activity: UserActivity = {
    id: `manual-${generateId()}`,
    timestamp: now(),
    durationMinutes,
    source,
    category,
    title,
    url,
    appName,
  };

  activityLog.push(activity);
  trackContextSwitch(input);

  return activity;
}

/** Track context switches */
function trackContextSwitch(currentAppOrUrl: string): void {
  // Reset counter every hour
  if (Date.now() - lastContextSwitchReset > 3600000) {
    contextSwitchCount = 0;
    lastContextSwitchReset = Date.now();
  }

  if (lastAppOrUrl && lastAppOrUrl !== currentAppOrUrl) {
    contextSwitchCount++;
  }
  lastAppOrUrl = currentAppOrUrl;
}

/** Get current context switch count */
export function getContextSwitchCount(): number {
  // Reset if over an hour old
  if (Date.now() - lastContextSwitchReset > 3600000) {
    contextSwitchCount = 0;
    lastContextSwitchReset = Date.now();
  }
  return contextSwitchCount;
}

/** Get all logged activities */
export function getActivities(): UserActivity[] {
  return [...activityLog];
}

/** Get today's activities only */
export function getTodayActivities(): UserActivity[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return activityLog.filter((a) => a.timestamp >= today);
}

/** Store activities from external sources */
export function storeActivities(activities: UserActivity[]): void {
  for (const activity of activities) {
    // Avoid duplicates based on ID
    if (!activityLog.some((a) => a.id === activity.id)) {
      activityLog.push(activity);
      trackContextSwitch(activity.url || activity.appName || activity.title);
    }
  }
}

/** Fetch all activities from configured sources */
export async function fetchAllActivities(
  sources: Array<{ type: string; apiKey?: string }>
): Promise<UserActivity[]> {
  const allActivities: UserActivity[] = [];

  for (const source of sources) {
    if (!source.apiKey) continue;

    switch (source.type) {
      case "github":
        allActivities.push(...(await fetchGitHubActivity(source.apiKey)));
        break;
      case "rescuetime":
        allActivities.push(...(await fetchRescueTimeActivity(source.apiKey)));
        break;
      case "toggl":
        allActivities.push(...(await fetchTogglActivity(source.apiKey)));
        break;
    }
  }

  // Store all fetched activities
  storeActivities(allActivities);

  // Activity Detection (Linux/Wayland)
  const systemActivity = await detectActivityState();
  if (systemActivity.status !== "UNKNOWN" && systemActivity.status !== "IDLE") {
      const activity = mapSystemActivityToUserActivity(systemActivity);
      storeActivities([activity]); // This will dedupe and track context switches
  }

  // Return today's activities (including manually logged)
  return getTodayActivities();
}

function mapSystemActivityToUserActivity(state: { status: ActivityStatus; appName: string; details: string }): UserActivity {
  let category = ActivityCategory.PRODUCTIVE;
  
  if (state.status === "PROCURING") category = ActivityCategory.BLATANT_PROCRASTINATION;
  if (state.status === "GAMING") category = ActivityCategory.BLATANT_PROCRASTINATION;
  if (state.status === "CODING") category = ActivityCategory.PRODUCTIVE;

  return {
    id: `sys-${now().getTime()}-${state.appName}`, // Unique ID per timestamp
    timestamp: now(),
    durationMinutes: 1, // Assume 1 minute snapshots
    source: "app" as const,
    category,
    title: `${state.appName} (${state.details})`,
    description: state.details,
    appName: state.appName
  };
}
