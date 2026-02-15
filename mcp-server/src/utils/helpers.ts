// ============================================================================
// Procrastination Shame Engine - Helper Utilities
// ============================================================================

import { v4 as uuidv4 } from "uuid";
import { ShameLevel, type HeatMapEntry } from "../types.js";

/** Generate a unique ID */
export function generateId(): string {
  return uuidv4();
}

/** Get current timestamp */
export function now(): Date {
  return new Date();
}

/** Format duration in minutes to human-readable string */
export function formatDuration(minutes: number): string {
  if (minutes < 1) return "less than a minute";
  if (minutes < 60) return `${Math.round(minutes)} minute${minutes !== 1 ? "s" : ""}`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (mins === 0) return `${hours} hour${hours !== 1 ? "s" : ""}`;
  return `${hours}h ${mins}m`;
}

/** Format minutes wasted into a shaming message */
export function formatWastedTime(minutes: number): string {
  if (minutes < 5) return "a few minutes";
  if (minutes < 30) return `${Math.round(minutes)} precious minutes`;
  if (minutes < 60) return `nearly an hour of your life`;
  if (minutes < 120) return `over an hour (${Math.round(minutes)} minutes!)`;
  const hours = Math.floor(minutes / 60);
  return `${hours}+ hours of your ONE life on this earth`;
}

/** Get the shame level color */
export function getShameLevelColor(level: ShameLevel): number {
  switch (level) {
    case ShameLevel.GENTLE_NUDGE:
      return 0x22c55e; // green
    case ShameLevel.PASSIVE_AGGRESSIVE:
      return 0xf59e0b; // amber
    case ShameLevel.DIRECT_CALLOUT:
      return 0xf97316; // orange
    case ShameLevel.AGGRESSIVE_SHAME:
      return 0xef4444; // red
    case ShameLevel.NUCLEAR_OPTION:
      return 0x7c3aed; // purple (nuclear)
  }
}

/** Get the shame level emoji */
export function getShameLevelEmoji(level: ShameLevel): string {
  switch (level) {
    case ShameLevel.GENTLE_NUDGE:
      return "😊";
    case ShameLevel.PASSIVE_AGGRESSIVE:
      return "🙄";
    case ShameLevel.DIRECT_CALLOUT:
      return "😤";
    case ShameLevel.AGGRESSIVE_SHAME:
      return "🔥";
    case ShameLevel.NUCLEAR_OPTION:
      return "☢️";
  }
}

/** Get shame level name */
export function getShameLevelName(level: ShameLevel): string {
  switch (level) {
    case ShameLevel.GENTLE_NUDGE:
      return "Gentle Nudge";
    case ShameLevel.PASSIVE_AGGRESSIVE:
      return "Passive Aggressive";
    case ShameLevel.DIRECT_CALLOUT:
      return "Direct Call-Out";
    case ShameLevel.AGGRESSIVE_SHAME:
      return "Aggressive Shame";
    case ShameLevel.NUCLEAR_OPTION:
      return "☢️ NUCLEAR OPTION ☢️";
  }
}

/** Calculate minutes until a date */
export function minutesUntil(date: Date): number {
  return Math.max(0, (date.getTime() - Date.now()) / 60000);
}

/** Check if current time is within work hours */
export function isWorkHours(
  workStart: number,
  workEnd: number,
  workDays: number[],
  timezone: string = "UTC"
): boolean {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    hour12: false,
    weekday: "short",
  });
  const parts = formatter.formatToParts(now);
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value || "0");
  const dayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  const day = dayMap[parts.find((p) => p.type === "weekday")?.value || "Mon"] ?? 1;

  return workDays.includes(day) && hour >= workStart && hour < workEnd;
}

/** Create empty heat map for a week */
export function createEmptyHeatMap(): HeatMapEntry[] {
  const entries: HeatMapEntry[] = [];
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      entries.push({
        dayOfWeek: day,
        hour,
        productivityScore: 0,
        activityCount: 0,
      });
    }
  }
  return entries;
}

/** Get a random element from an array */
export function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Clamp a number between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Calculate a progress bar string */
export function progressBar(value: number, max: number, length: number = 20): string {
  const filled = Math.round((value / max) * length);
  const empty = length - filled;
  return "█".repeat(filled) + "░".repeat(empty);
}

/** Score to color hex for dashboard */
export function scoreToColor(score: number): string {
  if (score <= 20) return "#22c55e";
  if (score <= 40) return "#84cc16";
  if (score <= 60) return "#f59e0b";
  if (score <= 80) return "#ef4444";
  return "#7c3aed";
}
