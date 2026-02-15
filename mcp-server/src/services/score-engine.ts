// ============================================================================
// Procrastination Shame Engine - Score Engine
// Calculates real-time procrastination scores using multiple factors
// ============================================================================

import { SCORE_WEIGHTS, SHAME_THRESHOLDS } from "../config.js";
import {
  ActivityCategory,
  ShameLevel,
  TaskPriority,
  TaskStatus,
  type ProcrastinationScore,
  type TrackedTask,
  type UserActivity,
} from "../types.js";
import { getCategoryWeight } from "../utils/categories.js";
import { clamp, formatDuration, now } from "../utils/helpers.js";

/** History of scores for trend calculation */
const scoreHistory: Array<{ score: number; timestamp: Date }> = [];

/** Track consecutive procrastination days */
let consecutiveProcrastinationDays = 0;
let lastDayChecked: string | null = null;

/**
 * Calculate the procrastination score (0-100)
 *
 * Score = Σ(weighted_factors) where:
 *  - Time Wasted Ratio: (non-productive time / total tracked time)
 *  - Deadline Proximity Multiplier: exponential penalty as deadlines approach
 *  - Task Completion Ratio: (overdue tasks / total tasks)
 *  - Priority Severity: penalty based on priority of avoided tasks
 *  - Streak Penalty: consecutive days of procrastination
 *  - Context Switch Penalty: frequency of app/site switches
 */
export function calculateProcrastinationScore(
  activities: UserActivity[],
  tasks: TrackedTask[],
  recentSwitches: number = 0
): ProcrastinationScore {
  // 1. Time Wasted Ratio (0-100)
  const timeWastedRatio = calculateTimeWastedRatio(activities);

  // 2. Deadline Proximity Multiplier (0-100)
  const deadlineProximityMultiplier = calculateDeadlineProximity(tasks);

  // 3. Task Completion Ratio (0-100)
  const taskCompletionRatio = calculateTaskCompletionRatio(tasks);

  // 4. Priority Severity Penalty (0-100)
  const prioritySeverityPenalty = calculatePrioritySeverity(tasks, activities);

  // 5. Streak Penalty (0-100)
  const streakPenalty = calculateStreakPenalty();

  // 6. Context Switch Penalty (0-100)
  const contextSwitchPenalty = calculateContextSwitchPenalty(recentSwitches);

  // Weighted sum
  const rawScore =
    timeWastedRatio * SCORE_WEIGHTS.TIME_WASTED_RATIO +
    deadlineProximityMultiplier * SCORE_WEIGHTS.DEADLINE_PROXIMITY +
    taskCompletionRatio * SCORE_WEIGHTS.TASK_COMPLETION +
    prioritySeverityPenalty * SCORE_WEIGHTS.PRIORITY_SEVERITY +
    streakPenalty * SCORE_WEIGHTS.STREAK_PENALTY +
    contextSwitchPenalty * SCORE_WEIGHTS.CONTEXT_SWITCH;

  const score = clamp(Math.round(rawScore), 0, 100);
  const shameLevel = scoreToShameLevel(score);
  const trend = calculateTrend(score);

  // Store in history
  scoreHistory.push({ score, timestamp: now() });
  if (scoreHistory.length > 1000) scoreHistory.shift();

  // Update streak tracking
  updateStreakTracking(score);

  const result: ProcrastinationScore = {
    score,
    shameLevel,
    breakdown: {
      timeWastedRatio,
      deadlineProximityMultiplier,
      taskCompletionRatio,
      prioritySeverityPenalty,
      streakPenalty,
      contextSwitchPenalty,
    },
    trend,
    calculatedAt: now(),
    summary: generateScoreSummary(score, shameLevel, activities, tasks),
  };

  return result;
}

/** Calculate what ratio of tracked time was wasted (non-productive) */
function calculateTimeWastedRatio(activities: UserActivity[]): number {
  if (activities.length === 0) return 50; // No data = assume 50/50

  let productiveMinutes = 0;
  let wastedMinutes = 0;

  for (const activity of activities) {
    const weight = getCategoryWeight(activity.category);
    wastedMinutes += activity.durationMinutes * weight;
    productiveMinutes += activity.durationMinutes * (1 - weight);
  }

  const totalMinutes = productiveMinutes + wastedMinutes;
  if (totalMinutes === 0) return 50;

  return clamp((wastedMinutes / totalMinutes) * 100, 0, 100);
}

/** Calculate deadline proximity pressure */
function calculateDeadlineProximity(tasks: TrackedTask[]): number {
  const pendingTasks = tasks.filter(
    (t) => t.status !== TaskStatus.DONE && t.dueDate
  );
  if (pendingTasks.length === 0) return 0;

  let maxPressure = 0;

  for (const task of pendingTasks) {
    if (!task.dueDate) continue;

    const hoursUntilDue = (task.dueDate.getTime() - Date.now()) / 3600000;

    let pressure: number;
    if (hoursUntilDue < 0) {
      // Already overdue - maximum pressure!
      pressure = 100;
    } else if (hoursUntilDue < 1) {
      pressure = 95; // Less than 1 hour: panic mode
    } else if (hoursUntilDue < 4) {
      pressure = 80; // Less than 4 hours: high pressure
    } else if (hoursUntilDue < 24) {
      pressure = 60; // Less than 1 day: medium-high
    } else if (hoursUntilDue < 72) {
      pressure = 40; // Less than 3 days: moderate
    } else if (hoursUntilDue < 168) {
      pressure = 20; // Less than 1 week: low
    } else {
      pressure = 5; // More than 1 week: minimal
    }

    // Priority multiplier
    const priorityMultiplier = task.priority === TaskPriority.P0_CRITICAL ? 1.5
      : task.priority === TaskPriority.P1_HIGH ? 1.3
      : task.priority === TaskPriority.P2_MEDIUM ? 1.0
      : 0.7;

    maxPressure = Math.max(maxPressure, pressure * priorityMultiplier);
  }

  return clamp(maxPressure, 0, 100);
}

/** Calculate task completion ratio (overdue/total) */
function calculateTaskCompletionRatio(tasks: TrackedTask[]): number {
  if (tasks.length === 0) return 0;

  const overdueTasks = tasks.filter(
    (t) =>
      t.status === TaskStatus.OVERDUE ||
      (t.status !== TaskStatus.DONE && t.dueDate && t.dueDate < new Date())
  );

  return clamp((overdueTasks.length / tasks.length) * 100, 0, 100);
}

/** Calculate penalty for avoiding high-priority tasks */
function calculatePrioritySeverity(
  tasks: TrackedTask[],
  activities: UserActivity[]
): number {
  const hasHighPriorityPending = tasks.some(
    (t) =>
      (t.priority === TaskPriority.P0_CRITICAL ||
        t.priority === TaskPriority.P1_HIGH) &&
      t.status !== TaskStatus.DONE
  );

  if (!hasHighPriorityPending) return 0;

  // Check if recent activities are procrastination
  const recentWasted = activities.filter(
    (a) =>
      a.category === ActivityCategory.BLATANT_PROCRASTINATION ||
      a.category === ActivityCategory.QUESTIONABLE
  );

  const wastedRatio =
    activities.length > 0 ? recentWasted.length / activities.length : 0;

  // Having high-priority tasks while procrastinating is especially bad
  const criticalCount = tasks.filter(
    (t) => t.priority === TaskPriority.P0_CRITICAL && t.status !== TaskStatus.DONE
  ).length;

  const penalty = wastedRatio * 100 * (1 + criticalCount * 0.3);
  return clamp(penalty, 0, 100);
}

/** Calculate streak penalty for consecutive procrastination days */
function calculateStreakPenalty(): number {
  // Each consecutive day adds 15 points, capped at 100
  return clamp(consecutiveProcrastinationDays * 15, 0, 100);
}

/** Calculate context switching penalty */
function calculateContextSwitchPenalty(switches: number): number {
  // More than 10 switches per hour is problematic
  // More than 20 is really bad
  if (switches <= 5) return 0;
  if (switches <= 10) return 20;
  if (switches <= 20) return 50;
  if (switches <= 30) return 75;
  return 100;
}

/** Convert score to shame level */
export function scoreToShameLevel(score: number): ShameLevel {
  if (score <= SHAME_THRESHOLDS.GENTLE_NUDGE.max) return ShameLevel.GENTLE_NUDGE;
  if (score <= SHAME_THRESHOLDS.PASSIVE_AGGRESSIVE.max) return ShameLevel.PASSIVE_AGGRESSIVE;
  if (score <= SHAME_THRESHOLDS.DIRECT_CALLOUT.max) return ShameLevel.DIRECT_CALLOUT;
  if (score <= SHAME_THRESHOLDS.AGGRESSIVE_SHAME.max) return ShameLevel.AGGRESSIVE_SHAME;
  return ShameLevel.NUCLEAR_OPTION;
}

/** Calculate trend from score history */
function calculateTrend(currentScore: number): "improving" | "worsening" | "stable" {
  if (scoreHistory.length < 3) return "stable";

  const recent = scoreHistory.slice(-5);
  const avgRecent = recent.reduce((sum, s) => sum + s.score, 0) / recent.length;

  if (currentScore < avgRecent - 5) return "improving";
  if (currentScore > avgRecent + 5) return "worsening";
  return "stable";
}

/** Update consecutive procrastination day tracking */
function updateStreakTracking(score: number): void {
  const today = new Date().toISOString().split("T")[0];
  if (today !== lastDayChecked) {
    lastDayChecked = today;
    if (score >= 50) {
      consecutiveProcrastinationDays++;
    } else {
      consecutiveProcrastinationDays = 0;
    }
  }
}

/** Generate human-readable score summary */
function generateScoreSummary(
  score: number,
  level: ShameLevel,
  activities: UserActivity[],
  tasks: TrackedTask[]
): string {
  const overdueTasks = tasks.filter(
    (t) => t.status === TaskStatus.OVERDUE ||
      (t.status !== TaskStatus.DONE && t.dueDate && t.dueDate < new Date())
  );

  const wastedActivities = activities.filter(
    (a) => a.category === ActivityCategory.BLATANT_PROCRASTINATION
  );

  const totalWastedMinutes = wastedActivities.reduce(
    (sum, a) => sum + a.durationMinutes, 0
  );

  const parts: string[] = [];
  parts.push(`Procrastination Score: ${score}/100`);

  if (totalWastedMinutes > 0) {
    parts.push(`Time wasted: ${formatDuration(totalWastedMinutes)}`);
  }

  if (overdueTasks.length > 0) {
    parts.push(`Overdue tasks: ${overdueTasks.length}`);
  }

  if (consecutiveProcrastinationDays > 1) {
    parts.push(`Procrastination streak: ${consecutiveProcrastinationDays} days 🔥`);
  }

  if (wastedActivities.length > 0) {
    const topWaste = wastedActivities
      .sort((a, b) => b.durationMinutes - a.durationMinutes)
      .slice(0, 3);
    parts.push(
      `Top distractions: ${topWaste.map((a) => a.title).join(", ")}`
    );
  }

  return parts.join(" | ");
}

/** Get the score history for graphing */
export function getScoreHistory(): Array<{ score: number; timestamp: Date }> {
  return [...scoreHistory];
}

/** Reset the score (e.g., user pressed "Admit Defeat and Start Working") */
export function resetScore(): void {
  consecutiveProcrastinationDays = 0;
  scoreHistory.push({ score: 0, timestamp: now() });
}
