import { ProcrastinationScore } from "../api";
import { cn } from "../lib/utils";

interface ScoreGaugeProps {
  score: ProcrastinationScore;
}

export function ScoreGauge({ score }: ScoreGaugeProps) {
  const value = score.score;
  const level = score.shameLevel;
  
  // Calculate circle properties
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const progress = (value / 100) * circumference;
  
  const isHigh = value > 50;
  const colorClass = isHigh ? "text-destructive" : "text-primary";
  
  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 flex flex-col items-center justify-center h-full w-full">
      <div className="relative w-48 h-48 flex items-center justify-center">
        <svg className="transform -rotate-90 w-full h-full">
          <circle
            cx="96"
            cy="96"
            r={radius}
            stroke="currentColor"
            strokeWidth="12"
            fill="transparent"
            className="text-muted/20"
          />
          <circle
            cx="96"
            cy="96"
            r={radius}
            stroke="currentColor"
            strokeWidth="12"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            strokeLinecap="round"
            className={cn("transition-all duration-1000 ease-out", colorClass)}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("text-4xl font-bold tracking-tighter", colorClass)}>
            {Math.round(value)}
          </span>
          <span className="text-xs text-muted-foreground uppercase font-medium mt-1">
            Current Score
          </span>
        </div>
      </div>
      
      <div className="mt-4 text-center">
        <div className={cn(
          "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          isHigh ? "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80" : "border-transparent bg-primary text-primary-foreground hover:bg-primary/80"
        )}>
           Level {level}
        </div>
        <p className="text-sm text-muted-foreground mt-2">
           {score.summary}
        </p>
      </div>
    </div>
  );
}
