import type { UserActivity } from "../api";

interface ActivityFeedProps {
  activities: UserActivity[];
}

function getCategoryBadge(category: string) {
  switch (category) {
    case "productive":
      return <span className="badge badge-green">✅ Productive</span>;
    case "productive_adjacent":
      return <span className="badge badge-green">📚 Research</span>;
    case "questionable":
      return <span className="badge badge-amber">🤔 Questionable</span>;
    case "blatant_procrastination":
      return <span className="badge badge-red">🚨 Procrastinating!</span>;
    default:
      return <span className="badge bg-gray-700 text-gray-300">{category}</span>;
  }
}

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p className="text-3xl mb-2">🕵️</p>
        <p className="text-sm">No activities tracked yet. Suspiciously quiet...</p>
      </div>
    );
  }

  // Show most recent first
  const sorted = [...activities].reverse();

  return (
    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
      {sorted.map((activity, idx) => (
        <div
          key={activity.id || idx}
          className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/40 hover:bg-gray-800/70 transition-colors"
        >
          <div className="text-xs text-gray-500 w-12 shrink-0 text-right">
            {formatTime(activity.timestamp)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{activity.title}</p>
            <p className="text-xs text-gray-500">
              {activity.durationMinutes}m · {activity.source}
              {activity.url && (
                <span className="ml-1 text-gray-600" title={activity.url}>
                  🔗
                </span>
              )}
            </p>
          </div>
          <div className="shrink-0">{getCategoryBadge(activity.category)}</div>
        </div>
      ))}
    </div>
  );
}
