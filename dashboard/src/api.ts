// ============================================================================
// Dashboard API client — fetches data from the MCP dashboard-api
// ============================================================================

const API_BASE = "/api";

export interface ScoreBreakdown {
  timeWastedRatio: number;
  deadlineProximityMultiplier: number;
  taskCompletionRatio: number;
  prioritySeverityPenalty: number;
  streakPenalty: number;
  contextSwitchPenalty: number;
}

export interface ScoreHistoryPoint {
  score: number;
  timestamp: string;
}

export interface ProcrastinationScore {
  score: number;
  shameLevel: number;
  breakdown: ScoreBreakdown;
  trend: "improving" | "worsening" | "stable";
  calculatedAt: string;
  summary: string;
}

export interface ShameMessage {
  level: number;
  message: string;
  emoji: string;
  action?: string;
  urgency: string;
  generatedAt: string;
}

export interface TrackedTask {
  id: string;
  title: string;
  source: string;
  priority: number;
  status: string;
  dueDate?: string;
  tags?: string[];
  projectName?: string;
}

export interface UserActivity {
  id: string;
  timestamp: string;
  durationMinutes: number;
  source: string;
  category: string;
  title: string;
  url?: string;
  appName?: string;
}

export interface MomCountdown {
  isActive: boolean;
  minutesRemaining: number;
  warningsSent: number;
}

export interface ProductivityReport {
  period: string;
  averageScore: number;
  worstScore: number;
  bestScore: number;
  totalTasksCompleted: number;
  totalTasksOverdue: number;
  totalMinutesProductive: number;
  totalMinutesWasted: number;
  topProcrastinationActivities: Array<{
    activity: string;
    totalMinutes: number;
    occurrences: number;
  }>;
}

export interface DashboardData {
  score: ProcrastinationScore;
  message: ShameMessage;
  tasks: TrackedTask[];
  activities: UserActivity[];
  scoreHistory: Array<{ score: number; timestamp: string }>;
  momCountdown: MomCountdown | null;
  report: ProductivityReport;
  contextSwitches: number;
  userName: string;
}

async function fetchJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`API error ${res.status}: ${res.statusText}`);
  return res.json();
}

export async function getDashboard(): Promise<DashboardData> {
  return fetchJSON("/dashboard");
}

export async function getScoreHistory(
  limit = 100
): Promise<{ history: Array<{ score: number; timestamp: string }> }> {
  return fetchJSON(`/score/history?limit=${limit}`);
}

export async function resetScore(): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/score/reset`, { method: "POST" });
  return res.json();
}

export async function getHealth(): Promise<{ status: string }> {
  return fetchJSON("/health");
}

/**
 * Subscribe to real-time server-sent events for live score updates
 */
export function subscribeToEvents(
  onUpdate: (data: { score: ProcrastinationScore; message: ShameMessage }) => void
): () => void {
  const evtSource = new EventSource(`${API_BASE}/events`);
  evtSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === "score_update") {
        onUpdate(data);
      }
    } catch { /* ignore parse errors */ }
  };
  return () => evtSource.close();
}
