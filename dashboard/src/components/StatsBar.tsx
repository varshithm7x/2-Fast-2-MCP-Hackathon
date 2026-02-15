import { ProcrastinationScore } from "../api";
import { Component, Zap, CheckCircle2 } from "lucide-react";

interface StatsBarProps {
  score: ProcrastinationScore;
  streak: number;
  tasksCompleted: number;
}

export function StatsBar({ score, streak, tasksCompleted }: StatsBarProps) {
  const stats = [
    { label: "Shame Level", value: `${score.shameLevel}/5`, icon: Component, desc: "Current DEFCON" },
    { label: "Streak", value: `${streak}h`, icon: Zap, desc: "Productive Hours" },
    { label: "Completed", value: tasksCompleted, icon: CheckCircle2, desc: "Tasks Done" },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {stats.map((stat, idx) => {
        const Icon = stat.icon;
        return (
          <div key={idx} className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 flex flex-row items-center justify-between space-y-0 pb-2">
             <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.desc}</p>
             </div>
             <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
        )
      })}
    </div>
  );
}
