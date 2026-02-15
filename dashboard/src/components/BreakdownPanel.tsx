import type { ScoreBreakdown } from "../api";

interface BreakdownPanelProps {
  breakdown: ScoreBreakdown;
}

interface FactorRow {
  label: string;
  emoji: string;
  value: number;
  description: string;
}

function getBarColor(value: number): string {
  if (value <= 25) return "bg-green-500";
  if (value <= 50) return "bg-amber-500";
  if (value <= 75) return "bg-orange-500";
  return "bg-red-500";
}

export function BreakdownPanel({ breakdown }: BreakdownPanelProps) {
  const factors: FactorRow[] = [
    {
      label: "Time Wasted",
      emoji: "⏰",
      value: Math.round(breakdown.timeWastedRatio),
      description: "Non-productive vs total time",
    },
    {
      label: "Deadline Pressure",
      emoji: "⚠️",
      value: Math.round(breakdown.deadlineProximityMultiplier),
      description: "How close deadlines are",
    },
    {
      label: "Task Completion",
      emoji: "📋",
      value: Math.round(breakdown.taskCompletionRatio),
      description: "Overdue vs total tasks",
    },
    {
      label: "Priority Severity",
      emoji: "🔥",
      value: Math.round(breakdown.prioritySeverityPenalty),
      description: "High-priority task avoidance",
    },
    {
      label: "Streak Penalty",
      emoji: "📅",
      value: Math.round(breakdown.streakPenalty),
      description: "Consecutive procrastination days",
    },
    {
      label: "Context Switching",
      emoji: "🔀",
      value: Math.round(breakdown.contextSwitchPenalty),
      description: "App/tab switching frequency",
    },
  ];

  return (
    <div className="shame-card">
      <h2 className="text-lg font-semibold mb-4">🧮 Score Breakdown</h2>
      <div className="space-y-3">
        {factors.map((f) => (
          <div key={f.label}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm">
                <span className="mr-1.5">{f.emoji}</span>
                {f.label}
              </span>
              <span className="text-sm font-semibold text-gray-300">{f.value}%</span>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${getBarColor(f.value)}`}
                style={{ width: `${f.value}%` }}
              />
            </div>
            <p className="text-xs text-gray-600 mt-0.5">{f.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
