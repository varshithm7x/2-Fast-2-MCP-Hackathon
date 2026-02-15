// ============================================================================
// Procrastination Shame Engine - Type Definitions
// ============================================================================

/** Activity categories for classifying user behavior */
export enum ActivityCategory {
  PRODUCTIVE = "productive",
  PRODUCTIVE_ADJACENT = "productive_adjacent",
  QUESTIONABLE = "questionable",
  BLATANT_PROCRASTINATION = "blatant_procrastination",
}

/** Shame escalation levels */
export enum ShameLevel {
  GENTLE_NUDGE = 1,
  PASSIVE_AGGRESSIVE = 2,
  DIRECT_CALLOUT = 3,
  AGGRESSIVE_SHAME = 4,
  NUCLEAR_OPTION = 5,
}

/** Task priority levels */
export enum TaskPriority {
  P0_CRITICAL = 0,
  P1_HIGH = 1,
  P2_MEDIUM = 2,
  P3_LOW = 3,
}

/** Task status */
export enum TaskStatus {
  TODO = "todo",
  IN_PROGRESS = "in_progress",
  DONE = "done",
  OVERDUE = "overdue",
  ABANDONED = "abandoned",
}

/** A tracked task from any task management source */
export interface TrackedTask {
  id: string;
  title: string;
  description?: string;
  source: "todoist" | "notion" | "linear" | "jira" | "manual";
  priority: TaskPriority;
  status: TaskStatus;
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  estimatedMinutes?: number;
  actualMinutes?: number;
  tags?: string[];
  projectName?: string;
}

/** A recorded user activity */
export interface UserActivity {
  id: string;
  timestamp: Date;
  durationMinutes: number;
  source: "browser" | "git" | "editor" | "app" | "time_tracker" | "manual";
  category: ActivityCategory;
  title: string;
  description?: string;
  url?: string;
  appName?: string;
  /** Raw data from the source for evidence */
  evidence?: Record<string, unknown>;
}

/** The procrastination score with all contributing factors */
export interface ProcrastinationScore {
  /** Overall score 0-100 (higher = more procrastination) */
  score: number;
  /** Current shame escalation level */
  shameLevel: ShameLevel;
  /** Breakdown of score components */
  breakdown: {
    timeWastedRatio: number;
    deadlineProximityMultiplier: number;
    taskCompletionRatio: number;
    prioritySeverityPenalty: number;
    streakPenalty: number;
    contextSwitchPenalty: number;
  };
  /** Trend direction */
  trend: "improving" | "worsening" | "stable";
  /** Score calculated at */
  calculatedAt: Date;
  /** Human-readable summary */
  summary: string;
}

/** An escalating shame message */
export interface ShameMessage {
  level: ShameLevel;
  message: string;
  emoji: string;
  action?: "discord_post" | "dashboard_update" | "email_warning" | "mom_email" | "desktop_notification";
  urgency: "low" | "medium" | "high" | "critical" | "nuclear";
  generatedAt: Date;
}

/** Discord shame post */
export interface DiscordShamePost {
  channelId: string;
  content: string;
  embeds: DiscordEmbed[];
  postedAt: Date;
}

/** Discord embed structure */
export interface DiscordEmbed {
  title: string;
  description: string;
  color: number;
  fields: Array<{ name: string; value: string; inline?: boolean }>;
  footer?: { text: string };
  timestamp?: string;
}

/** Mom email configuration */
export interface MomEmailConfig {
  momEmail: string;
  userName: string;
  warningThreshold: number;
  sendThreshold: number;
  cooldownMinutes: number;
  lastWarningAt?: Date;
  lastSentAt?: Date;
  enabled: boolean;
}

/** Dashboard state snapshot */
export interface DashboardState {
  currentScore: ProcrastinationScore;
  recentActivities: UserActivity[];
  tasks: TrackedTask[];
  shameWall: ShameWallEntry[];
  focusStreaks: FocusStreak[];
  heatMap: HeatMapEntry[];
  momCountdown?: MomCountdown;
  leaderboard?: LeaderboardEntry[];
}

/** Shame wall entry - broken commitments */
export interface ShameWallEntry {
  id: string;
  timestamp: Date;
  description: string;
  taskTitle: string;
  insteadOf: string;
  durationWasted: number;
  severity: "mild" | "moderate" | "severe" | "catastrophic";
}

/** Focus streak tracking */
export interface FocusStreak {
  startedAt: Date;
  endedAt?: Date;
  durationMinutes: number;
  tasksCompleted: number;
  isActive: boolean;
}

/** Heat map entry for productivity by hour */
export interface HeatMapEntry {
  dayOfWeek: number;
  hour: number;
  productivityScore: number;
  activityCount: number;
}

/** Mom email countdown state */
export interface MomCountdown {
  isActive: boolean;
  triggerScore: number;
  currentScore: number;
  minutesRemaining: number;
  warningsSent: number;
  willSendAt?: Date;
}

/** Leaderboard entry for team shaming */
export interface LeaderboardEntry {
  userId: string;
  userName: string;
  averageScore: number;
  worstScore: number;
  tasksCompleted: number;
  rank: number;
  streak: number;
  title: string;
}

/** Anti-disable mechanism state */
export interface AntiDisableState {
  isWorkHours: boolean;
  canDisable: boolean;
  disableAttempts: number;
  lastDisableAttempt?: Date;
  requiredTasksToDisable: string[];
  managerApprovalRequired: boolean;
  suspiciousActivity: boolean;
}

/** User configuration for the engine */
export interface EngineConfig {
  userId: string;
  userName: string;
  timezone: string;
  workHoursStart: number;
  workHoursEnd: number;
  workDays: number[];
  momEmail?: MomEmailConfig;
  discordWebhookUrl?: string;
  discordChannelId?: string;
  taskSources: Array<{
    type: "todoist" | "notion" | "linear" | "jira";
    apiKey?: string;
    projectId?: string;
  }>;
  activitySources: Array<{
    type: "github" | "browser" | "rescuetime" | "toggl";
    apiKey?: string;
  }>;
  shameLevelOverrides?: Partial<Record<ShameLevel, boolean>>;
  pollingIntervalMinutes: number;
  focusModeEnabled: boolean;
  /** Positive reinforcement intensity (0-10) */
  positiveReinforcementLevel: number;
}

/** Productivity report for a time period */
export interface ProductivityReport {
  period: "daily" | "weekly" | "monthly";
  startDate: Date;
  endDate: Date;
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
  shameLevelDistribution: Record<ShameLevel, number>;
  improvements: string[];
  concerns: string[];
  redemptionArcs: string[];
}

/** Event emitted by the engine */
export interface EngineEvent {
  type:
    | "score_updated"
    | "shame_message"
    | "task_completed"
    | "task_overdue"
    | "activity_logged"
    | "mom_warning"
    | "mom_email_sent"
    | "disable_attempt"
    | "focus_streak_started"
    | "focus_streak_ended"
    | "leaderboard_updated"
    | "discord_posted";
  timestamp: Date;
  data: Record<string, unknown>;
}
