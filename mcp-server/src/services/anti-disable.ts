// ============================================================================
// Procrastination Shame Engine - Anti-Disable Mechanisms
// Uses Archestra Dynamic Tools to prevent disabling during work hours
// ============================================================================

import type { AntiDisableState, EngineConfig, TrackedTask } from "../types.js";
import { TaskStatus } from "../types.js";
import { isWorkHours } from "../utils/helpers.js";

/** Track disable attempts for shaming purposes */
const disableAttempts: Array<{ timestamp: Date; reason?: string }> = [];

/**
 * Check if the engine can be disabled/paused
 */
export function canDisableEngine(
  config: EngineConfig,
  tasks: TrackedTask[]
): AntiDisableState {
  const workHours = isWorkHours(
    config.workHoursStart,
    config.workHoursEnd,
    config.workDays,
    config.timezone
  );

  // Get incomplete tasks
  const incompleteTasks = tasks.filter(
    (t) => t.status !== TaskStatus.DONE && t.status !== TaskStatus.ABANDONED
  );

  // High priority incomplete tasks
  const criticalTasks = incompleteTasks.filter(
    (t) => t.priority <= 1 // P0 or P1
  );

  // Determine if disable requires manager approval
  const managerRequired = workHours && criticalTasks.length > 0;

  // Check for suspicious patterns
  const recentAttempts = disableAttempts.filter(
    (a) => Date.now() - a.timestamp.getTime() < 3600000 // Last hour
  );
  const suspicious = recentAttempts.length >= 3; // 3+ attempts in an hour is suspicious

  // Can disable only if:
  // 1. Not work hours, OR
  // 2. All critical tasks are done, OR
  // 3. Focus mode is enabled (user gets a pass)
  const canDisable =
    config.focusModeEnabled ||
    !workHours ||
    criticalTasks.length === 0;

  return {
    isWorkHours: workHours,
    canDisable,
    disableAttempts: recentAttempts.length,
    lastDisableAttempt:
      disableAttempts.length > 0
        ? disableAttempts[disableAttempts.length - 1].timestamp
        : undefined,
    requiredTasksToDisable: criticalTasks.map((t) => t.title),
    managerApprovalRequired: managerRequired,
    suspiciousActivity: suspicious,
  };
}

/**
 * Attempt to disable the engine
 * Returns a message about whether it was allowed
 */
export function attemptDisable(
  config: EngineConfig,
  tasks: TrackedTask[],
  reason?: string
): { allowed: boolean; message: string } {
  // Log the attempt
  disableAttempts.push({ timestamp: new Date(), reason });

  const state = canDisableEngine(config, tasks);

  if (state.suspiciousActivity) {
    return {
      allowed: false,
      message: `🚨 SUSPICIOUS ACTIVITY DETECTED: ${state.disableAttempts} disable attempts in the last hour! ` +
        `This has been logged to the shame dashboard. Nice try.`,
    };
  }

  if (!state.canDisable) {
    const taskList = state.requiredTasksToDisable
      .slice(0, 3)
      .map((t) => `  • ${t}`)
      .join("\n");

    if (state.managerApprovalRequired) {
      return {
        allowed: false,
        message:
          `❌ Cannot disable during work hours with critical tasks pending.\n\n` +
          `Required tasks to complete first:\n${taskList}\n\n` +
          `Or get manager approval. (Ha! Good luck explaining that one.)`,
      };
    }

    return {
      allowed: false,
      message:
        `❌ Nice try! You can't disable shame during work hours.\n\n` +
        `Complete these tasks first:\n${taskList}\n\n` +
        `The Shame Engine watches. The Shame Engine knows. 👁️`,
    };
  }

  return {
    allowed: true,
    message: "✅ Engine paused. But remember: the shame never truly stops. It waits. 😈",
  };
}

/**
 * Generate a shame message for disable attempts
 */
export function getDisableAttemptShame(): string {
  const totalAttempts = disableAttempts.length;

  if (totalAttempts === 0) return "";

  const messages = [
    `You've tried to disable the Shame Engine ${totalAttempts} time${totalAttempts > 1 ? "s" : ""}. That's not productive either.`,
    `Disable attempt #${totalAttempts} logged. Your desperation is being tracked. 📊`,
    `Every disable attempt adds +5 to your procrastination score. Just saying.`,
    `The Shame Engine doesn't turn off. The Shame Engine just gets stronger. 💪`,
    `${totalAttempts} disable attempts. Imagine if you spent that energy on actual work.`,
    `I've seen ${totalAttempts} disable attempts. Want to know what I haven't seen? Completed tasks.`,
  ];

  return messages[Math.min(totalAttempts - 1, messages.length - 1)];
}

/**
 * Check for auto-re-enable conditions
 * Should be called periodically to re-enable if disabled suspiciously
 */
export function checkAutoReEnable(config: EngineConfig): {
  shouldReEnable: boolean;
  reason: string;
} {
  const workHours = isWorkHours(
    config.workHoursStart,
    config.workHoursEnd,
    config.workDays,
    config.timezone
  );

  if (!workHours) {
    return { shouldReEnable: false, reason: "Outside work hours" };
  }

  // If there were recent disable attempts, it's suspicious
  const recentAttempts = disableAttempts.filter(
    (a) => Date.now() - a.timestamp.getTime() < 1800000 // Last 30 min
  );

  if (recentAttempts.length >= 2) {
    return {
      shouldReEnable: true,
      reason: `Suspicious: ${recentAttempts.length} disable attempts in last 30 minutes during work hours`,
    };
  }

  return { shouldReEnable: false, reason: "No suspicious activity" };
}

/** Get all disable attempts for the shame dashboard */
export function getDisableAttemptLog(): Array<{ timestamp: Date; reason?: string }> {
  return [...disableAttempts];
}
