// ============================================================================
// Procrastination Shame Engine - Discord Shamer Service
// Posts shame messages and leaderboards to Discord via webhooks
// ============================================================================

import type {
  DiscordEmbed,
  ProcrastinationScore,
  ProductivityReport,
  LeaderboardEntry,
  ShameMessage,
  UserActivity,
  TrackedTask,
} from "../types.js";
import { ShameLevel, ActivityCategory, TaskStatus } from "../types.js";
import {
  getShameLevelColor,
  getShameLevelEmoji,
  getShameLevelName,
  progressBar,
  formatDuration,
  scoreToColor,
} from "../utils/helpers.js";

/**
 * Send a shame message to Discord via webhook
 */
export async function postShameToDiscord(
  webhookUrl: string,
  message: ShameMessage,
  score: ProcrastinationScore,
  userName: string
): Promise<boolean> {
  try {
    const embed: DiscordEmbed = {
      title: `${getShameLevelEmoji(message.level)} ${getShameLevelName(message.level)} — ${userName}`,
      description: message.message,
      color: getShameLevelColor(message.level),
      fields: [
        {
          name: "📊 Procrastination Score",
          value: `**${score.score}/100** ${progressBar(score.score, 100, 15)}`,
          inline: true,
        },
        {
          name: "📈 Trend",
          value: score.trend === "improving" ? "📉 Improving" : score.trend === "worsening" ? "📈 Worsening" : "➡️ Stable",
          inline: true,
        },
        {
          name: "🔥 Shame Level",
          value: getShameLevelName(message.level),
          inline: true,
        },
      ],
      footer: { text: "Procrastination Shame Engine™ — Your productivity, publicly judged." },
      timestamp: new Date().toISOString(),
    };

    // Add breakdown fields for higher shame levels
    if (message.level >= ShameLevel.DIRECT_CALLOUT) {
      embed.fields.push(
        {
          name: "⏰ Time Wasted Ratio",
          value: `${Math.round(score.breakdown.timeWastedRatio)}%`,
          inline: true,
        },
        {
          name: "⚠️ Deadline Pressure",
          value: `${Math.round(score.breakdown.deadlineProximityMultiplier)}%`,
          inline: true,
        },
        {
          name: "📋 Task Completion",
          value: `${Math.round(100 - score.breakdown.taskCompletionRatio)}%`,
          inline: true,
        }
      );
    }

    const payload = {
      username: "Shame Engine 🔔",
      avatar_url: "https://em-content.zobj.net/source/twitter/408/bell_1f514.png",
      embeds: [embed],
    };

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    return response.ok;
  } catch (error) {
    console.error("Failed to post to Discord:", error);
    return false;
  }
}

/**
 * Post daily procrastination report to Discord
 */
export async function postDailyReport(
  webhookUrl: string,
  report: ProductivityReport,
  userName: string
): Promise<boolean> {
  try {
    const topProcrastination = report.topProcrastinationActivities
      .slice(0, 5)
      .map((a, i) => `${i + 1}. **${a.activity}** — ${formatDuration(a.totalMinutes)} (${a.occurrences}x)`)
      .join("\n");

    const embed: DiscordEmbed = {
      title: `📋 Daily Procrastination Report — ${userName}`,
      description: `Here's how ${userName} "worked" today:`,
      color: parseInt(scoreToColor(report.averageScore).replace("#", ""), 16),
      fields: [
        {
          name: "📊 Average Score",
          value: `**${Math.round(report.averageScore)}/100**`,
          inline: true,
        },
        {
          name: "🏆 Best Score",
          value: `${Math.round(report.bestScore)}/100`,
          inline: true,
        },
        {
          name: "💀 Worst Score",
          value: `${Math.round(report.worstScore)}/100`,
          inline: true,
        },
        {
          name: "✅ Tasks Completed",
          value: `${report.totalTasksCompleted}`,
          inline: true,
        },
        {
          name: "⏰ Tasks Overdue",
          value: `${report.totalTasksOverdue}`,
          inline: true,
        },
        {
          name: "⏱️ Productive Time",
          value: formatDuration(report.totalMinutesProductive),
          inline: true,
        },
        {
          name: "🗑️ Wasted Time",
          value: formatDuration(report.totalMinutesWasted),
          inline: true,
        },
        {
          name: "🏆 Top Procrastination Activities",
          value: topProcrastination || "None (suspicious...)",
          inline: false,
        },
      ],
      footer: { text: "Procrastination Shame Engine™ — Tomorrow will be different. (It won't.)" },
      timestamp: new Date().toISOString(),
    };

    // Add redemption arcs if any
    if (report.redemptionArcs.length > 0) {
      embed.fields.push({
        name: "🦸 Redemption Arcs",
        value: report.redemptionArcs.join("\n"),
        inline: false,
      });
    }

    const payload = {
      username: "Shame Engine 📋",
      embeds: [embed],
    };

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    return response.ok;
  } catch (error) {
    console.error("Failed to post daily report to Discord:", error);
    return false;
  }
}

/**
 * Post Hall of Shame leaderboard to Discord
 */
export async function postLeaderboard(
  webhookUrl: string,
  entries: LeaderboardEntry[]
): Promise<boolean> {
  try {
    const medals = ["🥇", "🥈", "🥉"];
    const leaderboardText = entries
      .sort((a, b) => b.averageScore - a.averageScore)
      .slice(0, 10)
      .map(
        (e, i) =>
          `${medals[i] || `${i + 1}.`} **${e.userName}** — Score: ${Math.round(e.averageScore)} | Tasks: ${e.tasksCompleted} | Title: *${e.title}*`
      )
      .join("\n");

    const embed: DiscordEmbed = {
      title: "🏆 HALL OF SHAME — Weekly Leaderboard",
      description: leaderboardText || "No data yet. Start procrastinating!",
      color: 0x7c3aed,
      fields: [
        {
          name: "🎖️ Awards",
          value: generateAwards(entries),
          inline: false,
        },
      ],
      footer: { text: "Higher score = more shame. Congratulations?" },
      timestamp: new Date().toISOString(),
    };

    const payload = {
      username: "Shame Engine 🏆",
      embeds: [embed],
    };

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    return response.ok;
  } catch (error) {
    console.error("Failed to post leaderboard to Discord:", error);
    return false;
  }
}

/** Generate achievement/award text */
function generateAwards(entries: LeaderboardEntry[]): string {
  if (entries.length === 0) return "No awards this week.";

  const awards: string[] = [];

  // Highest average score
  const worstEntry = entries.sort((a, b) => b.averageScore - a.averageScore)[0];
  if (worstEntry) {
    awards.push(`🗑️ **Master Procrastinator**: ${worstEntry.userName} (avg: ${Math.round(worstEntry.averageScore)})`);
  }

  // Most tasks completed despite procrastination
  const productiveEntry = entries.sort((a, b) => b.tasksCompleted - a.tasksCompleted)[0];
  if (productiveEntry && productiveEntry.tasksCompleted > 0) {
    awards.push(`⚡ **Chaotic Productive**: ${productiveEntry.userName} (${productiveEntry.tasksCompleted} tasks)`);
  }

  // Longest streak
  const streakEntry = entries.sort((a, b) => b.streak - a.streak)[0];
  if (streakEntry && streakEntry.streak > 0) {
    awards.push(`🔥 **Iron Focus**: ${streakEntry.userName} (${streakEntry.streak} day streak)`);
  }

  // Worst single score
  const worstMoment = entries.sort((a, b) => b.worstScore - a.worstScore)[0];
  if (worstMoment && worstMoment.worstScore >= 80) {
    awards.push(`☢️ **Nuclear Meltdown**: ${worstMoment.userName} (peak: ${Math.round(worstMoment.worstScore)})`);
  }

  return awards.join("\n") || "No notable awards.";
}

/**
 * Generate a productivity report from activities and tasks
 */
export function generateReport(
  activities: UserActivity[],
  tasks: TrackedTask[],
  scores: Array<{ score: number }>,
  period: "daily" | "weekly" | "monthly" = "daily"
): ProductivityReport {
  const wastedActivities = activities.filter(
    (a) =>
      a.category === ActivityCategory.BLATANT_PROCRASTINATION ||
      a.category === ActivityCategory.QUESTIONABLE
  );

  const productiveActivities = activities.filter(
    (a) =>
      a.category === ActivityCategory.PRODUCTIVE ||
      a.category === ActivityCategory.PRODUCTIVE_ADJACENT
  );

  // Group procrastination activities
  const activityGroups = new Map<string, { totalMinutes: number; occurrences: number }>();
  for (const activity of wastedActivities) {
    const key = activity.title;
    const existing = activityGroups.get(key) || { totalMinutes: 0, occurrences: 0 };
    existing.totalMinutes += activity.durationMinutes;
    existing.occurrences += 1;
    activityGroups.set(key, existing);
  }

  const topProcrastination = Array.from(activityGroups.entries())
    .map(([activity, stats]) => ({ activity, ...stats }))
    .sort((a, b) => b.totalMinutes - a.totalMinutes)
    .slice(0, 10);

  const scoreValues = scores.map((s) => s.score);
  const avgScore = scoreValues.length > 0
    ? scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length
    : 0;

  return {
    period,
    startDate: new Date(),
    endDate: new Date(),
    averageScore: avgScore,
    worstScore: scoreValues.length > 0 ? Math.max(...scoreValues) : 0,
    bestScore: scoreValues.length > 0 ? Math.min(...scoreValues) : 0,
    totalTasksCompleted: tasks.filter((t) => t.status === TaskStatus.DONE).length,
    totalTasksOverdue: tasks.filter((t) => t.status === TaskStatus.OVERDUE).length,
    totalMinutesProductive: productiveActivities.reduce((s, a) => s + a.durationMinutes, 0),
    totalMinutesWasted: wastedActivities.reduce((s, a) => s + a.durationMinutes, 0),
    topProcrastinationActivities: topProcrastination,
    shameLevelDistribution: calculateShameLevelDistribution(scoreValues),
    improvements: [],
    concerns: [],
    redemptionArcs: [],
  };
}

function calculateShameLevelDistribution(
  scores: number[]
): Record<ShameLevel, number> {
  const dist: Record<ShameLevel, number> = {
    [ShameLevel.GENTLE_NUDGE]: 0,
    [ShameLevel.PASSIVE_AGGRESSIVE]: 0,
    [ShameLevel.DIRECT_CALLOUT]: 0,
    [ShameLevel.AGGRESSIVE_SHAME]: 0,
    [ShameLevel.NUCLEAR_OPTION]: 0,
  };

  for (const score of scores) {
    if (score <= 20) dist[ShameLevel.GENTLE_NUDGE]++;
    else if (score <= 40) dist[ShameLevel.PASSIVE_AGGRESSIVE]++;
    else if (score <= 60) dist[ShameLevel.DIRECT_CALLOUT]++;
    else if (score <= 80) dist[ShameLevel.AGGRESSIVE_SHAME]++;
    else dist[ShameLevel.NUCLEAR_OPTION]++;
  }

  return dist;
}
