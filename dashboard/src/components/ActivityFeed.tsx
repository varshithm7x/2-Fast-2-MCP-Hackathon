import { UserActivity } from "../api";
import { cn } from "../lib/utils";
import { Laptop, Code, Coffee, Globe, Monitor } from "lucide-react";

interface ActivityFeedProps {
  activities: UserActivity[];
}

function getIcon(category: string) {
  switch (category) {
    case "productive": return Code;
    case "productive_adjacent": return Laptop;
    case "questionable": return Globe;
    case "blatant_procrastination": return Coffee;
    default: return Laptop;
  }
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  const sorted = [...activities].reverse();

  return (
    <div className="space-y-8 relative">
        <div className="absolute left-4 top-2 bottom-2 w-px bg-border" />
          {sorted.map((activity, idx) => {
            const Icon = activity.source === 'app' ? Monitor : getIcon(activity.category);
           return (
             <div key={idx} className="relative pl-10">
                <div className={cn(
                   "absolute left-2 top-1 h-4 w-4 rounded-full border bg-background shadow flex items-center justify-center translate-x-[-1px]",
                   activity.category === 'blatant_procrastination' ? "border-destructive text-destructive" : "border-primary text-primary"
                )}>
                   <div className={cn("h-2 w-2 rounded-full bg-current")} />
                </div>
                     <div className="flex flex-col gap-1">
                       <p className="text-sm font-medium leading-none text-foreground">{activity.title}</p>
                       <div className="flex items-center gap-2 text-xs text-muted-foreground">
                         <Icon className="w-3 h-3" />
                         <span>
                          {activity.source === 'app' ? (activity.appName || 'Application') : activity.source}
                         </span>
                         <span>•</span>
                         <span>{new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                         <span>•</span>
                         <span>{activity.durationMinutes}m</span>
                       </div>
                     </div>
             </div>
           )
        })}
        {sorted.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-8">No activity recorded yet.</div>
        )}
    </div>
  );
}
