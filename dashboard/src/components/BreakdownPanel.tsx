import { ScoreBreakdown } from "../api";
import { cn } from "../lib/utils";

interface BreakdownPanelProps {
  breakdown: ScoreBreakdown;
}

export function BreakdownPanel({ breakdown }: BreakdownPanelProps) {
  const items = [
    { label: "Time Wasted", value: breakdown.timeWastedRatio, format: "percent", color: "text-destructive" },
    { label: "Deadline Logic", value: breakdown.deadlineProximityMultiplier, format: "multiplier", color: "text-muted-foreground" },
    { label: "Task Completion", value: breakdown.taskCompletionRatio, format: "percent", color: "text-primary" },
    { label: "Context Switching", value: breakdown.contextSwitchPenalty, format: "flat", color: "text-warning" },
  ];

  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow-sm h-full">
      <div className="flex flex-col space-y-1.5 p-6">
        <h3 className="font-semibold leading-none tracking-tight">Score Breakdown</h3>
        <p className="text-sm text-muted-foreground">Why you are failing (mathematically).</p>
      </div>
      <div className="p-6 pt-0 grid grid-cols-2 gap-4">
         {items.map((item, idx) => (
           <div key={idx} className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">{item.label}</p>
              <p className={cn("text-2xl font-bold", item.color)}>
                 {item.format === 'percent' ? `${Math.round(item.value * 100)}%` : 
                  item.format === 'multiplier' ? `${item.value.toFixed(1)}x` : 
                  item.value}
              </p>
           </div>
         ))}
      </div>
    </div>
  );
}
