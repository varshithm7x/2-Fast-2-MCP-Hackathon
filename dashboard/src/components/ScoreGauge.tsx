import { useMemo } from "react";

interface ScoreGaugeProps {
  score: number;
  trend: "improving" | "worsening" | "stable";
}

function getScoreColor(score: number): string {
  if (score <= 20) return "#22c55e";
  if (score <= 40) return "#84cc16";
  if (score <= 60) return "#f59e0b";
  if (score <= 80) return "#ef4444";
  return "#7c3aed";
}

function getTrendEmoji(trend: string): string {
  switch (trend) {
    case "improving": return "📉";
    case "worsening": return "📈";
    default: return "➡️";
  }
}

function getScoreLabel(score: number): string {
  if (score <= 20) return "Doing fine";
  if (score <= 40) return "Slipping...";
  if (score <= 60) return "Uh oh";
  if (score <= 80) return "Code red!";
  return "NUCLEAR";
}

export function ScoreGauge({ score, trend }: ScoreGaugeProps) {
  const color = useMemo(() => getScoreColor(score), [score]);
  const circumference = 2 * Math.PI * 90;
  const progress = (score / 100) * circumference;
  const isNuclear = score > 80;

  return (
    <div className="relative flex flex-col items-center">
      <svg width="220" height="220" viewBox="0 0 220 220" className={isNuclear ? "animate-pulse-fast" : ""}>
        {/* Background ring */}
        <circle
          cx="110"
          cy="110"
          r="90"
          fill="none"
          stroke="#1f2937"
          strokeWidth="16"
          strokeLinecap="round"
        />
        {/* Progress ring */}
        <circle
          cx="110"
          cy="110"
          r="90"
          fill="none"
          stroke={color}
          strokeWidth="16"
          strokeLinecap="round"
          strokeDasharray={`${progress} ${circumference - progress}`}
          strokeDashoffset={circumference / 4}
          className="transition-all duration-1000 ease-out"
          style={{ filter: isNuclear ? `drop-shadow(0 0 12px ${color})` : undefined }}
        />
        {/* Score text */}
        <text
          x="110"
          y="100"
          textAnchor="middle"
          fill={color}
          fontSize="48"
          fontWeight="800"
          className="transition-all duration-500"
        >
          {score}
        </text>
        <text x="110" y="125" textAnchor="middle" fill="#9ca3af" fontSize="14">
          / 100
        </text>
      </svg>

      <div className="text-center mt-2">
        <span
          className="text-sm font-semibold px-3 py-1 rounded-full"
          style={{ backgroundColor: `${color}22`, color }}
        >
          {getTrendEmoji(trend)} {getScoreLabel(score)}
        </span>
        <p className="text-xs text-gray-500 mt-1">
          Trend: {trend === "improving" ? "Getting better!" : trend === "worsening" ? "Getting worse..." : "Holding steady"}
        </p>
      </div>
    </div>
  );
}
