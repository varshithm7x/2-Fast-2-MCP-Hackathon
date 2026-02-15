import type { ProductivityReport } from "../api";

interface StatsBarProps {
  report: ProductivityReport;
  contextSwitches: number;
  tasksTotal: number;
}

function formatMinutes(min: number): string {
  if (min < 60) return `${Math.round(min)}m`;
  const hours = Math.floor(min / 60);
  const mins = Math.round(min % 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export function StatsBar({ report, contextSwitches, tasksTotal }: StatsBarProps) {
  const stats = [
    {
      label: "Tasks Done",
      value: report.totalTasksCompleted,
      emoji: "✅",
      color: "text-green-400",
    },
    {
      label: "Tasks Overdue",
      value: report.totalTasksOverdue,
      emoji: "🔴",
      color: report.totalTasksOverdue > 0 ? "text-red-400" : "text-gray-400",
    },
    {
      label: "Productive",
      value: formatMinutes(report.totalMinutesProductive),
      emoji: "💪",
      color: "text-green-400",
    },
    {
      label: "Wasted",
      value: formatMinutes(report.totalMinutesWasted),
      emoji: "🗑️",
      color: report.totalMinutesWasted > 60 ? "text-red-400" : "text-amber-400",
    },
    {
      label: "Switches",
      value: contextSwitches,
      emoji: "🔀",
      color: contextSwitches > 20 ? "text-red-400" : "text-gray-400",
    },
    {
      label: "Avg Score",
      value: Math.round(report.averageScore),
      emoji: "📊",
      color: report.averageScore > 60 ? "text-red-400" : report.averageScore > 30 ? "text-amber-400" : "text-green-400",
    },
  ];

  return (
    <div className="shame-card">
      <h2 className="text-sm font-semibold mb-3 text-gray-400">📊 Today's Stats</h2>
      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className="flex items-center gap-2">
            <span className="text-lg">{stat.emoji}</span>
            <div>
              <p className={`text-lg font-bold leading-tight ${stat.color}`}>
                {stat.value}
              </p>
              <p className="text-xs text-gray-500">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
