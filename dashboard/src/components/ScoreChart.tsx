import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface ScoreChartProps {
  history: Array<{ score: number; timestamp: string }>;
}

function getZoneColor(score: number): string {
  if (score <= 20) return "#22c55e";
  if (score <= 40) return "#84cc16";
  if (score <= 60) return "#f59e0b";
  if (score <= 80) return "#ef4444";
  return "#7c3aed";
}

export function ScoreChart({ history }: ScoreChartProps) {
  if (history.length < 2) {
    return (
      <div className="h-[250px] flex items-center justify-center text-gray-500">
        <div className="text-center">
          <p className="text-3xl mb-2">📊</p>
          <p className="text-sm">Not enough data for a chart yet. Keep procrastinating!</p>
        </div>
      </div>
    );
  }

  const data = history.map((entry) => ({
    ...entry,
    time: new Date(entry.timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
    fill: getZoneColor(entry.score),
  }));

  return (
    <ResponsiveContainer width="100%" height={250}>
      <AreaChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <defs>
          <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.5} />
            <stop offset="40%" stopColor="#f59e0b" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#22c55e" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
        <XAxis dataKey="time" tick={{ fill: "#6b7280", fontSize: 11 }} />
        <YAxis domain={[0, 100]} tick={{ fill: "#6b7280", fontSize: 11 }} />
        <Tooltip
          contentStyle={{
            backgroundColor: "#111827",
            border: "1px solid #374151",
            borderRadius: "8px",
            color: "#e5e7eb",
          }}
          formatter={(value: number) => [`${value}/100`, "Procrastination Score"]}
        />
        {/* Shame zone lines */}
        <ReferenceLine y={20} stroke="#22c55e" strokeDasharray="4 4" strokeOpacity={0.3} />
        <ReferenceLine y={40} stroke="#84cc16" strokeDasharray="4 4" strokeOpacity={0.3} />
        <ReferenceLine y={60} stroke="#f59e0b" strokeDasharray="4 4" strokeOpacity={0.3} />
        <ReferenceLine y={80} stroke="#ef4444" strokeDasharray="4 4" strokeOpacity={0.3} />
        <Area
          type="monotone"
          dataKey="score"
          stroke="#7c3aed"
          fill="url(#scoreGradient)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 5, fill: "#7c3aed" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
