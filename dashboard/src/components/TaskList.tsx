import type { TrackedTask } from "../api";

interface TaskListProps {
  tasks: TrackedTask[];
}

function getPriorityBadge(priority: number) {
  switch (priority) {
    case 0: return <span className="badge badge-red">P0 Critical</span>;
    case 1: return <span className="badge badge-red">P1 High</span>;
    case 2: return <span className="badge badge-amber">P2 Medium</span>;
    case 3: return <span className="badge badge-green">P3 Low</span>;
    default: return null;
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case "done": return "✅";
    case "in_progress": return "🔄";
    case "overdue": return "🔴";
    case "todo": return "⬜";
    case "abandoned": return "💀";
    default: return "⬜";
  }
}

function isOverdue(task: TrackedTask): boolean {
  if (task.status === "done") return false;
  if (task.status === "overdue") return true;
  if (task.dueDate && new Date(task.dueDate) < new Date()) return true;
  return false;
}

function formatDueDate(date: string): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffHours = diffMs / 3600000;

  if (diffHours < -24) return `${Math.round(-diffHours / 24)}d overdue`;
  if (diffHours < 0) return `${Math.round(-diffHours)}h overdue`;
  if (diffHours < 1) return `${Math.round(diffHours * 60)}m left`;
  if (diffHours < 24) return `${Math.round(diffHours)}h left`;
  return `${Math.round(diffHours / 24)}d left`;
}

export function TaskList({ tasks }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p className="text-3xl mb-2">📭</p>
        <p className="text-sm">No tasks synced yet. Connect a task source!</p>
      </div>
    );
  }

  // Sort: overdue first, then by priority
  const sorted = [...tasks].sort((a, b) => {
    const aOverdue = isOverdue(a) ? 0 : 1;
    const bOverdue = isOverdue(b) ? 0 : 1;
    if (aOverdue !== bOverdue) return aOverdue - bOverdue;
    return a.priority - b.priority;
  });

  return (
    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
      {sorted.map((task) => (
        <div
          key={task.id}
          className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
            isOverdue(task)
              ? "bg-red-500/10 border border-red-500/20"
              : task.status === "done"
                ? "bg-green-500/5 border border-green-500/10 opacity-60"
                : "bg-gray-800/40 hover:bg-gray-800/70"
          }`}
        >
          <span className="text-lg shrink-0">{getStatusIcon(task.status)}</span>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium truncate ${task.status === "done" ? "line-through text-gray-500" : ""}`}>
              {task.title}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-gray-500">{task.source}</span>
              {task.dueDate && (
                <span className={`text-xs ${isOverdue(task) ? "text-red-400 font-semibold" : "text-gray-400"}`}>
                  ⏰ {formatDueDate(task.dueDate)}
                </span>
              )}
            </div>
          </div>
          <div className="shrink-0">{getPriorityBadge(task.priority)}</div>
        </div>
      ))}
    </div>
  );
}
