// ============================================================================
// Procrastination Shame Engine - MCP Tool Registration
// Exposes all engine functionality as MCP tools
// ============================================================================

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { loadConfig } from "../config.js";
import { TaskPriority, TaskStatus, type ProcrastinationScore, type TrackedTask, type UserActivity } from "../types.js";
import { categorizeActivity } from "../utils/categories.js";
import { formatDuration, getShameLevelName } from "../utils/helpers.js";

// Services
import { fetchAllActivities, getActivities, getContextSwitchCount, logActivity, getTodayActivities } from "../services/activity-monitor.js";
import { attemptDisable, canDisableEngine, getDisableAttemptShame } from "../services/anti-disable.js";
import { generateReport, postDailyReport, postLeaderboard, postShameToDiscord } from "../services/discord-shamer.js";
import { cancelMomCountdown, checkMomEmailTrigger, getMomCountdownStatus, sendMomEmailNuclear, sendMomEmailWarning, sendWarning } from "../services/email-service.js";
import { fetchTodayCommits, getCodingStreak, fetchPRActivity } from "../services/github-tracker.js";
import { generateCreativeExcuse, generatePositiveMessage, generateRedemptionArc, generateShameMessage, generateStreakMessage } from "../services/message-generator.js";
import { calculateProcrastinationScore, getScoreHistory, resetScore, scoreToShameLevel } from "../services/score-engine.js";
import { addManualTask, completeTask, fetchAllTasks, getAllTasks } from "../services/task-tracker.js";

/** Shared state */
let lastScore: ProcrastinationScore | null = null;
let enginePaused = false;

/**
 * Register all MCP tools on the server
 */
export function registerTools(server: McpServer): void {
  // ========================================================================
  // SCORE & STATUS TOOLS
  // ========================================================================

  server.tool(
    "get_procrastination_score",
    "Calculate and return the current procrastination score (0-100) with full breakdown, shame level, and trend analysis. This is the main tool for checking how badly you're procrastinating.",
    {},
    async () => {
      const config = loadConfig();
      const tasks = getAllTasks();
      const activities = getTodayActivities();
      const switches = getContextSwitchCount();

      const score = calculateProcrastinationScore(activities, tasks, switches);
      lastScore = score;

      const message = generateShameMessage(score, tasks, activities, switches);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                score: score.score,
                shameLevel: getShameLevelName(score.shameLevel),
                trend: score.trend,
                breakdown: score.breakdown,
                summary: score.summary,
                shameMessage: message.message,
                emoji: message.emoji,
                urgency: message.urgency,
                suggestedAction: message.action,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.tool(
    "get_dashboard_state",
    "Get the full dashboard state including score, activities, tasks, shame wall, and all metrics for the dashboard UI.",
    {},
    async () => {
      const config = loadConfig();
      const tasks = getAllTasks();
      const activities = getTodayActivities();
      const switches = getContextSwitchCount();

      const score = calculateProcrastinationScore(activities, tasks, switches);
      lastScore = score;

      const scoreHist = getScoreHistory();
      const momStatus = config.momEmail
        ? getMomCountdownStatus(config.momEmail)
        : null;

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                currentScore: score,
                recentActivities: activities.slice(-20),
                tasks,
                scoreHistory: scoreHist.slice(-50),
                momCountdown: momStatus,
                enginePaused,
                contextSwitches: switches,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.tool(
    "get_score_history",
    "Get the historical procrastination scores for graphing trends over time.",
    {
      limit: z.number().optional().describe("Maximum number of score entries to return (default: 50)"),
    },
    async ({ limit }) => {
      const history = getScoreHistory();
      const sliced = history.slice(-(limit || 50));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(sliced, null, 2),
          },
        ],
      };
    }
  );

  // ========================================================================
  // TASK MANAGEMENT TOOLS
  // ========================================================================

  server.tool(
    "sync_tasks",
    "Fetch and sync tasks from all configured task management sources (Todoist, Notion, Linear, Jira). Returns unified task list.",
    {},
    async () => {
      const config = loadConfig();
      const tasks = await fetchAllTasks(config.taskSources);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                totalTasks: tasks.length,
                byStatus: {
                  todo: tasks.filter((t) => t.status === TaskStatus.TODO).length,
                  inProgress: tasks.filter((t) => t.status === TaskStatus.IN_PROGRESS).length,
                  done: tasks.filter((t) => t.status === TaskStatus.DONE).length,
                  overdue: tasks.filter(
                    (t) =>
                      t.status === TaskStatus.OVERDUE ||
                      (t.dueDate && t.dueDate < new Date() && t.status !== TaskStatus.DONE)
                  ).length,
                },
                tasks: tasks.map((t) => ({
                  id: t.id,
                  title: t.title,
                  source: t.source,
                  priority: t.priority,
                  status: t.status,
                  dueDate: t.dueDate,
                })),
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.tool(
    "add_task",
    "Manually add a task to track. For when you need to add tasks not coming from an integration.",
    {
      title: z.string().describe("Task title/description"),
      priority: z
        .enum(["p0", "p1", "p2", "p3"])
        .optional()
        .describe("Priority level: p0=critical, p1=high, p2=medium, p3=low"),
      dueDate: z.string().optional().describe("Due date in ISO format (e.g., 2025-02-15T17:00:00Z)"),
    },
    async ({ title, priority, dueDate }) => {
      const priorityMap: Record<string, TaskPriority> = {
        p0: TaskPriority.P0_CRITICAL,
        p1: TaskPriority.P1_HIGH,
        p2: TaskPriority.P2_MEDIUM,
        p3: TaskPriority.P3_LOW,
      };

      const task = addManualTask(title, priorityMap[priority || "p2"], dueDate);

      return {
        content: [
          {
            type: "text",
            text: `✅ Task added: "${task.title}" (${priority || "p2"})${dueDate ? ` — Due: ${dueDate}` : ""}\nID: ${task.id}`,
          },
        ],
      };
    }
  );

  server.tool(
    "complete_task",
    "Mark a task as completed. This will positively affect your procrastination score! 🎉",
    {
      taskId: z.string().describe("The task ID to mark as complete"),
    },
    async ({ taskId }) => {
      const task = completeTask(taskId);

      if (!task) {
        return {
          content: [{ type: "text", text: `❌ Task not found: ${taskId}` }],
        };
      }

      const positive = generatePositiveMessage(task.title);

      return {
        content: [
          {
            type: "text",
            text: `${positive.message}\n\nTask "${task.title}" marked as DONE! ✅`,
          },
        ],
      };
    }
  );

  // ========================================================================
  // ACTIVITY MONITORING TOOLS
  // ========================================================================

  server.tool(
    "sync_activities",
    "Fetch and sync activities from all configured sources (GitHub, RescueTime, Toggl). Returns today's activity log.",
    {},
    async () => {
      const config = loadConfig();
      const activities = await fetchAllActivities(config.activitySources);

      const byCategory = {
        productive: activities.filter((a) => a.category === "productive"),
        productiveAdjacent: activities.filter((a) => a.category === "productive_adjacent"),
        questionable: activities.filter((a) => a.category === "questionable"),
        blatantProcrastination: activities.filter((a) => a.category === "blatant_procrastination"),
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                totalActivities: activities.length,
                byCategory: {
                  productive: byCategory.productive.length,
                  productiveAdjacent: byCategory.productiveAdjacent.length,
                  questionable: byCategory.questionable.length,
                  blatantProcrastination: byCategory.blatantProcrastination.length,
                },
                contextSwitches: getContextSwitchCount(),
                activities: activities.slice(-30).map((a) => ({
                  title: a.title,
                  category: a.category,
                  durationMinutes: a.durationMinutes,
                  source: a.source,
                  timestamp: a.timestamp,
                })),
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.tool(
    "log_activity",
    "Manually log an activity (for tracking what you're doing when automatic monitoring isn't available).",
    {
      title: z.string().describe("What you're doing (e.g., 'Browsing Reddit', 'Working on feature X')"),
      durationMinutes: z.number().describe("How long you've been doing this (in minutes)"),
      url: z.string().optional().describe("URL if it's a browser activity"),
      appName: z.string().optional().describe("Application name if it's a desktop app"),
    },
    async ({ title, durationMinutes, url, appName }) => {
      const activity = logActivity(title, durationMinutes, "manual", url, appName);

      return {
        content: [
          {
            type: "text",
            text: `📝 Activity logged: "${title}" (${durationMinutes}min) — Categorized as: **${activity.category}** ${activity.category === "blatant_procrastination" ? "🚨 CAUGHT!" : activity.category === "productive" ? "👍" : "🤔"}`,
          },
        ],
      };
    }
  );

  server.tool(
    "check_github_activity",
    "Check today's GitHub activity including commits, PRs, and coding streaks. Shows if you're actually coding.",
    {},
    async () => {
      const config = loadConfig();
      const githubSource = config.activitySources.find((s) => s.type === "github");

      if (!githubSource?.apiKey) {
        return {
          content: [
            {
              type: "text",
              text: "❌ GitHub token not configured. Set GITHUB_TOKEN environment variable.",
            },
          ],
        };
      }

      const [commits, prs, streak] = await Promise.all([
        fetchTodayCommits(githubSource.apiKey),
        fetchPRActivity(githubSource.apiKey),
        getCodingStreak(githubSource.apiKey),
      ]);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                todayCommits: streak.todayCommits,
                weekCommits: streak.weekCommits,
                isActivelyCoding: streak.isActivelyCoding,
                lastCommitAt: streak.lastCommitAt,
                recentCommits: commits.slice(0, 10).map((c) => ({
                  title: c.title,
                  timestamp: c.timestamp,
                })),
                recentPRs: prs.slice(0, 5).map((p) => ({
                  title: p.title,
                  timestamp: p.timestamp,
                })),
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // ========================================================================
  // SHAME & MESSAGING TOOLS
  // ========================================================================

  server.tool(
    "get_shame_message",
    "Generate a shame message based on the current procrastination score. The message escalates with your score.",
    {},
    async () => {
      const tasks = getAllTasks();
      const activities = getTodayActivities();
      const switches = getContextSwitchCount();
      const score = calculateProcrastinationScore(activities, tasks, switches);
      lastScore = score;

      const message = generateShameMessage(score, tasks, activities, switches);

      return {
        content: [
          {
            type: "text",
            text: `${message.emoji} **${getShameLevelName(message.level)}** (Score: ${score.score}/100)\n\n${message.message}`,
          },
        ],
      };
    }
  );

  server.tool(
    "post_shame_to_discord",
    "Post a shame message with the current procrastination score to the configured Discord channel. Public humiliation activated!",
    {
      customMessage: z.string().optional().describe("Optional custom message to include"),
    },
    async ({ customMessage }) => {
      const config = loadConfig();

      if (!config.discordWebhookUrl) {
        return {
          content: [
            {
              type: "text",
              text: "❌ Discord webhook not configured. Set DISCORD_WEBHOOK_URL environment variable.",
            },
          ],
        };
      }

      const tasks = getAllTasks();
      const activities = getTodayActivities();
      const switches = getContextSwitchCount();
      const score = calculateProcrastinationScore(activities, tasks, switches);
      lastScore = score;

      const message = generateShameMessage(score, tasks, activities, switches);
      if (customMessage) {
        message.message = `${customMessage}\n\n${message.message}`;
      }

      const success = await postShameToDiscord(
        config.discordWebhookUrl,
        message,
        score,
        config.userName
      );

      return {
        content: [
          {
            type: "text",
            text: success
              ? `✅ Shame posted to Discord! Score: ${score.score}/100. The whole team can see your shame now.`
              : "❌ Failed to post to Discord. Your shame remains private... for now.",
          },
        ],
      };
    }
  );

  server.tool(
    "post_daily_report",
    "Post a full daily procrastination report to Discord with stats, rankings, and top procrastination activities.",
    {},
    async () => {
      const config = loadConfig();

      if (!config.discordWebhookUrl) {
        return {
          content: [
            {
              type: "text",
              text: "❌ Discord webhook not configured.",
            },
          ],
        };
      }

      const tasks = getAllTasks();
      const activities = getTodayActivities();
      const scores = getScoreHistory();
      const report = generateReport(activities, tasks, scores, "daily");

      const success = await postDailyReport(
        config.discordWebhookUrl,
        report,
        config.userName
      );

      return {
        content: [
          {
            type: "text",
            text: success
              ? `📋 Daily report posted to Discord!\n\nSummary: Avg Score: ${Math.round(report.averageScore)} | Tasks Done: ${report.totalTasksCompleted} | Time Wasted: ${formatDuration(report.totalMinutesWasted)}`
              : "❌ Failed to post daily report.",
          },
        ],
      };
    }
  );

  server.tool(
    "generate_creative_excuse",
    "Generate a hilariously creative AI-generated excuse for your procrastination. For entertainment purposes only.",
    {},
    async () => {
      const excuse = generateCreativeExcuse();

      return {
        content: [
          {
            type: "text",
            text: `🎭 Your AI-Generated Excuse:\n\n"${excuse}"\n\n(Warning: Using this excuse may result in additional shame.)`,
          },
        ],
      };
    }
  );

  // ========================================================================
  // MOM EMAIL TOOLS
  // ========================================================================

  server.tool(
    "check_mom_email_status",
    "Check the current Mom Email threat status - is the countdown active? How many warnings have been sent?",
    {},
    async () => {
      const config = loadConfig();

      if (!config.momEmail) {
        return {
          content: [
            {
              type: "text",
              text: "Mom email not configured. Set MOM_EMAIL environment variable to enable the nuclear option. (We dare you.)",
            },
          ],
        };
      }

      const status = getMomCountdownStatus(config.momEmail);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                enabled: config.momEmail.enabled,
                momEmail: config.momEmail.momEmail.replace(/(?<=.{2}).(?=.*@)/g, "*"),
                countdownActive: status.isActive,
                minutesRemaining: status.minutesRemaining,
                warningsSent: status.warningsSent,
                warningThreshold: config.momEmail.warningThreshold,
                sendThreshold: config.momEmail.sendThreshold,
                message: status.isActive
                  ? `⚠️ MOM EMAIL COUNTDOWN ACTIVE! ${status.minutesRemaining} minutes remaining!`
                  : "Mom email on standby. Behave.",
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.tool(
    "trigger_mom_email_check",
    "Manually trigger a check of whether the Mom Email should be sent based on current procrastination score.",
    {},
    async () => {
      const config = loadConfig();

      if (!config.momEmail) {
        return {
          content: [
            { type: "text", text: "Mom email not configured." },
          ],
        };
      }

      const tasks = getAllTasks();
      const activities = getTodayActivities();
      const score = calculateProcrastinationScore(activities, tasks, getContextSwitchCount());
      lastScore = score;

      const trigger = checkMomEmailTrigger(config.momEmail, score);

      if (trigger.shouldSend) {
        const report = generateReport(activities, tasks, getScoreHistory(), "daily");
        const sent = await sendMomEmailNuclear(config.momEmail, score, report);
        return {
          content: [
            {
              type: "text",
              text: sent
                ? `☢️ MOM EMAIL SENT. Score was ${score.score}/100. Your mother has been informed. Good luck.`
                : "Failed to send mom email. You got lucky THIS time.",
            },
          ],
        };
      }

      if (trigger.shouldWarn) {
        const warning = sendWarning();
        return {
          content: [
            {
              type: "text",
              text: `${warning}\n\nScore: ${score.score}/100 | Threshold: ${config.momEmail.sendThreshold}${trigger.minutesRemaining > 0 ? ` | Countdown: ${trigger.minutesRemaining}min` : ""}`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: `Your score (${score.score}/100) is below the Mom Email threshold (${config.momEmail.warningThreshold}). Keep it that way.`,
          },
        ],
      };
    }
  );

  server.tool(
    "cancel_mom_countdown",
    "Cancel the Mom Email countdown (only works if you've started actually working!).",
    {},
    async () => {
      const result = cancelMomCountdown();
      return {
        content: [{ type: "text", text: result }],
      };
    }
  );

  // ========================================================================
  // ANTI-DISABLE TOOLS
  // ========================================================================

  server.tool(
    "attempt_disable",
    "Try to pause/disable the Shame Engine. Good luck — it's not that easy during work hours.",
    {
      reason: z.string().optional().describe("Why you want to disable the engine (will be logged and judged)"),
    },
    async ({ reason }) => {
      const config = loadConfig();
      const tasks = getAllTasks();
      const result = attemptDisable(config, tasks, reason);

      if (result.allowed) {
        enginePaused = true;
      }

      return {
        content: [{ type: "text", text: result.message }],
      };
    }
  );

  server.tool(
    "check_disable_status",
    "Check if the engine can currently be disabled and what's required.",
    {},
    async () => {
      const config = loadConfig();
      const tasks = getAllTasks();
      const state = canDisableEngine(config, tasks);
      const disableShame = getDisableAttemptShame();

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                canDisable: state.canDisable,
                isWorkHours: state.isWorkHours,
                disableAttempts: state.disableAttempts,
                requiredTasks: state.requiredTasksToDisable,
                managerApprovalRequired: state.managerApprovalRequired,
                suspiciousActivity: state.suspiciousActivity,
                shameMessage: disableShame,
                enginePaused,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // ========================================================================
  // POSITIVE REINFORCEMENT
  // ========================================================================

  server.tool(
    "admit_defeat_start_working",
    "Press this to admit you've been procrastinating and commit to starting work. Resets your score and gives you a fresh start.",
    {},
    async () => {
      resetScore();
      enginePaused = false;
      const previousScore = lastScore?.score || 50;

      return {
        content: [
          {
            type: "text",
            text: `🏳️ You've admitted defeat. Respect.\n\n` +
              `Your procrastination score has been reset to 0.\n` +
              `Previous score: ${previousScore}/100\n\n` +
              `This is your redemption moment. Don't blow it.\n` +
              `The clock starts NOW. Every second counts.\n\n` +
              `💪 You've got this. Seriously. Go make something amazing.`,
          },
        ],
      };
    }
  );

  server.tool(
    "get_productivity_report",
    "Generate a detailed productivity report for the current period with stats, trends, and insights.",
    {
      period: z.enum(["daily", "weekly", "monthly"]).optional().describe("Report period (default: daily)"),
    },
    async ({ period }) => {
      const tasks = getAllTasks();
      const activities = getTodayActivities();
      const scores = getScoreHistory();
      const report = generateReport(activities, tasks, scores, period || "daily");

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(report, null, 2),
          },
        ],
      };
    }
  );

  server.tool(
    "categorize_url",
    "Check how a URL or app name would be categorized by the Shame Engine. Useful for testing what counts as productive.",
    {
      input: z.string().describe("URL or application name to categorize"),
    },
    async ({ input }) => {
      const category = categorizeActivity(input);
      const labels: Record<string, string> = {
        productive: "✅ Productive — Actually working!",
        productive_adjacent: "📚 Productive-Adjacent — \"Research\" (suuure)",
        questionable: "🤔 Questionable — Could go either way...",
        blatant_procrastination: "🚨 BLATANT PROCRASTINATION — Caught red-handed!",
      };

      return {
        content: [
          {
            type: "text",
            text: `Category for "${input}": ${labels[category] || category}`,
          },
        ],
      };
    }
  );
}
