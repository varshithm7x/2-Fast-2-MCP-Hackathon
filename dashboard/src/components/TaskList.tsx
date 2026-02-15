import { TrackedTask } from "../api";
import { Check, AlertTriangle, Circle } from "lucide-react";

interface TaskListProps {
  tasks: TrackedTask[];
}

export function TaskList({ tasks }: TaskListProps) {
  const sorted = [...tasks].sort((a, b) => {
     const aCompleted = a.status === 'done' || a.status === 'completed';
     const bCompleted = b.status === 'done' || b.status === 'completed';
     if (aCompleted !== bCompleted) return Number(aCompleted) - Number(bCompleted);
     
     if (!a.dueDate) return 1;
     if (!b.dueDate) return -1;
     return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow-sm h-full flex flex-col">
      <div className="flex flex-col space-y-1.5 p-6">
         <h3 className="font-semibold leading-none tracking-tight">Active Tasks</h3>
         <p className="text-sm text-muted-foreground">Your commitments (or lack thereof).</p>
      </div>
      <div className="p-6 pt-0 flex-1 overflow-y-auto min-h-0">
         <div className="w-full pr-2">
            <div className="space-y-4">
              {sorted.map(task => {
                const isCompleted = task.status === 'done' || task.status === 'completed';
                const isOverdue = !isCompleted && task.dueDate && new Date(task.dueDate) < new Date();
                
                return (
                  <div key={task.id} className="flex items-start justify-between space-x-4">
                     <div className="flex items-center space-x-4">
                        {isCompleted ? (
                           <Check className="h-4 w-4 text-primary" />
                        ) : (
                           <Circle className="h-4 w-4 text-muted-foreground" />
                        )}
                        <div className="space-y-1">
                           <p className={`text-sm font-medium leading-none ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                              {task.title}
                           </p>
                           <p className="text-xs text-muted-foreground">
                              {task.source} {task.dueDate && `• ${new Date(task.dueDate).toLocaleDateString()}`}
                           </p>
                        </div>
                     </div>
                     {isOverdue && (
                        <div className="flex items-center text-destructive text-xs">
                           <AlertTriangle className="mr-1 h-3 w-3" />
                           Overdue
                        </div>
                     )}
                  </div>
                );
              })}
              {sorted.length === 0 && (
                 <div className="text-sm text-muted-foreground text-center py-6">No tasks tracked.</div>
              )}
            </div>
         </div>
      </div>
    </div>
  );
}
