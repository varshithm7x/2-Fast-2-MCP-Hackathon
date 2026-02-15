// ============================================================================
// Procrastination Shame Engine - Configuration
// ============================================================================

import type { EngineConfig, MomEmailConfig } from "./types.js";

/** Default work schedule */
const DEFAULT_WORK_HOURS_START = 9;
const DEFAULT_WORK_HOURS_END = 17;
const DEFAULT_WORK_DAYS = [1, 2, 3, 4, 5]; // Mon-Fri

/** Environment variable configuration */
export function loadConfig(): EngineConfig {
  return {
    userId: process.env.SHAME_USER_ID || "default-user",
    userName: process.env.SHAME_USER_NAME || "Procrastinator",
    timezone: process.env.SHAME_TIMEZONE || "UTC",
    workHoursStart: parseInt(process.env.SHAME_WORK_START || String(DEFAULT_WORK_HOURS_START)),
    workHoursEnd: parseInt(process.env.SHAME_WORK_END || String(DEFAULT_WORK_HOURS_END)),
    workDays: process.env.SHAME_WORK_DAYS
      ? process.env.SHAME_WORK_DAYS.split(",").map(Number)
      : DEFAULT_WORK_DAYS,
    momEmail: loadMomEmailConfig(),
    discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL,
    discordChannelId: process.env.DISCORD_CHANNEL_ID,
    taskSources: loadTaskSources(),
    activitySources: loadActivitySources(),
    pollingIntervalMinutes: parseInt(process.env.SHAME_POLLING_INTERVAL || "5"),
    focusModeEnabled: false,
    positiveReinforcementLevel: parseInt(process.env.SHAME_POSITIVE_LEVEL || "3"),
  };
}

function loadMomEmailConfig(): MomEmailConfig | undefined {
  const momEmail = process.env.MOM_EMAIL;
  if (!momEmail) return undefined;

  return {
    momEmail,
    userName: process.env.SHAME_USER_NAME || "Your Child",
    warningThreshold: parseInt(process.env.MOM_WARNING_THRESHOLD || "85"),
    sendThreshold: parseInt(process.env.MOM_SEND_THRESHOLD || "95"),
    cooldownMinutes: parseInt(process.env.MOM_COOLDOWN_MINUTES || "60"),
    enabled: process.env.MOM_EMAIL_ENABLED !== "false",
  };
}

function loadTaskSources(): EngineConfig["taskSources"] {
  const sources: EngineConfig["taskSources"] = [];

  if (process.env.TODOIST_API_KEY) {
    sources.push({ type: "todoist", apiKey: process.env.TODOIST_API_KEY });
  }
  if (process.env.NOTION_API_KEY) {
    sources.push({
      type: "notion",
      apiKey: process.env.NOTION_API_KEY,
      projectId: process.env.NOTION_DATABASE_ID,
    });
  }
  if (process.env.LINEAR_API_KEY) {
    sources.push({ type: "linear", apiKey: process.env.LINEAR_API_KEY });
  }
  if (process.env.JIRA_API_KEY) {
    sources.push({
      type: "jira",
      apiKey: process.env.JIRA_API_KEY,
      projectId: process.env.JIRA_PROJECT_KEY,
    });
  }

  return sources;
}

function loadActivitySources(): EngineConfig["activitySources"] {
  const sources: EngineConfig["activitySources"] = [];

  if (process.env.GITHUB_TOKEN) {
    sources.push({ type: "github", apiKey: process.env.GITHUB_TOKEN });
  }
  if (process.env.RESCUETIME_API_KEY) {
    sources.push({ type: "rescuetime", apiKey: process.env.RESCUETIME_API_KEY });
  }
  if (process.env.TOGGL_API_KEY) {
    sources.push({ type: "toggl", apiKey: process.env.TOGGL_API_KEY });
  }

  return sources;
}

/** Shame level score thresholds */
export const SHAME_THRESHOLDS = {
  GENTLE_NUDGE: { min: 0, max: 20 },
  PASSIVE_AGGRESSIVE: { min: 21, max: 40 },
  DIRECT_CALLOUT: { min: 41, max: 60 },
  AGGRESSIVE_SHAME: { min: 61, max: 80 },
  NUCLEAR_OPTION: { min: 81, max: 100 },
} as const;

/** Score weights for the procrastination algorithm */
export const SCORE_WEIGHTS = {
  TIME_WASTED_RATIO: 0.35,
  DEADLINE_PROXIMITY: 0.25,
  TASK_COMPLETION: 0.15,
  PRIORITY_SEVERITY: 0.10,
  STREAK_PENALTY: 0.10,
  CONTEXT_SWITCH: 0.05,
} as const;

/** Dashboard API port */
export const DASHBOARD_PORT = parseInt(process.env.DASHBOARD_PORT || "3737");

/** MCP Server transport type */
export const MCP_TRANSPORT = (process.env.MCP_TRANSPORT || "stdio") as "stdio" | "streamable-http";
export const MCP_HTTP_PORT = parseInt(process.env.MCP_HTTP_PORT || "8080");
