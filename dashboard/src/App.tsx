import { useState, useEffect, useCallback } from "react";
import type { DashboardData } from "./api";
import { getDashboard, resetScore, subscribeToEvents } from "./api";
import { ScoreGauge } from "./components/ScoreGauge";
import { ShameMessageBar } from "./components/ShameMessageBar";
import { ActivityFeed } from "./components/ActivityFeed";;
import { TaskList } from "./components/TaskList";
import { ScoreChart } from "./components/ScoreChart";
import { MomCountdown } from "./components/MomCountdown";
import { BreakdownPanel } from "./components/BreakdownPanel";
import { StatsBar } from "./components/StatsBar";

function getShameLevelName(level: number): string {
  switch (level) {
    case 1: return "Gentle Nudge";
    case 2: return "Passive Aggressive";
    case 3: return "Direct Call-Out";
    case 4: return "Aggressive Shame";
    case 5: return "☢️ NUCLEAR OPTION";
    default: return "Unknown";
  }
}

export default function App() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchData = useCallback(async () => {
    try {
      const dashboard = await getDashboard();
      setData(dashboard);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError("Failed to connect to Shame Engine API. Is the server running?");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [fetchData]);

  // SSE for real-time updates
  useEffect(() => {
    const unsubscribe = subscribeToEvents(({ score, message }) => {
      setData((prev) =>
        prev ? { ...prev, score, message } : prev
      );
      setLastUpdated(new Date());
    });
    return unsubscribe;
  }, []);

  const handleAdmitDefeat = async () => {
    const result = await resetScore();
    if (result.success) {
      fetchData();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🔔</div>
          <h1 className="text-2xl font-bold text-gray-300">Loading Shame Engine...</h1>
          <p className="text-gray-500 mt-2">Calculating your disappointment metrics...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">😵</div>
          <h1 className="text-2xl font-bold text-red-400 mb-2">Connection Failed</h1>
          <p className="text-gray-400 mb-4">{error}</p>
          <p className="text-sm text-gray-500 mb-6">
            Start the MCP server with <code className="bg-gray-800 px-2 py-1 rounded">npm run dev</code> in the mcp-server directory.
          </p>
          <button
            onClick={fetchData}
            className="bg-purple-600 hover:bg-purple-700 px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const isNuclear = data.score.shameLevel >= 5;
  const score = data.score.score;

  return (
    <div className={`min-h-screen ${isNuclear ? "nuclear-mode" : ""}`}>
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔔</span>
            <div>
              <h1 className="text-lg font-bold">Procrastination Shame Engine</h1>
              <p className="text-xs text-gray-500">
                Tracking <span className="text-purple-400 font-medium">{data.userName}</span>
                {" · "}
                Level: <span className={`font-medium ${
                  score <= 20 ? "text-green-400" :
                  score <= 40 ? "text-lime-400" :
                  score <= 60 ? "text-amber-400" :
                  score <= 80 ? "text-red-400" :
                  "text-purple-400"
                }`}>{getShameLevelName(data.score.shameLevel)}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
            <button
              onClick={fetchData}
              className="text-xs bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg transition-colors"
            >
              ↻ Refresh
            </button>
          </div>
        </div>
      </header>

      {/* Shame Message Banner */}
      <ShameMessageBar message={data.message} score={data.score.score} />

      {/* Main Grid */}
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Top row: Score + Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Giant Score Gauge */}
          <div className="shame-card flex flex-col items-center justify-center">
            <ScoreGauge score={score} trend={data.score.trend} />
            <button
              onClick={handleAdmitDefeat}
              className="mt-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-green-900/30 hover:shadow-green-900/50"
            >
              🏳️ Admit Defeat & Start Working
            </button>
          </div>

          {/* Score Breakdown */}
          <BreakdownPanel breakdown={data.score.breakdown} />

          {/* Stats & Mom Countdown */}
          <div className="space-y-6">
            <StatsBar
              report={data.report}
              contextSwitches={data.contextSwitches}
              tasksTotal={data.tasks.length}
            />
            {data.momCountdown && data.momCountdown.isActive && (
              <MomCountdown countdown={data.momCountdown} />
            )}
          </div>
        </div>

        {/* Middle: Score Trend Chart */}
        <div className="shame-card">
          <h2 className="text-lg font-semibold mb-4">📈 Procrastination Trend</h2>
          <ScoreChart history={data.scoreHistory} />
        </div>

        {/* Bottom: Activities + Tasks */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="shame-card">
            <h2 className="text-lg font-semibold mb-4">📊 Activity Feed</h2>
            <ActivityFeed activities={data.activities} />
          </div>

          <div className="shame-card">
            <h2 className="text-lg font-semibold mb-4">📋 Tasks</h2>
            <TaskList tasks={data.tasks} />
          </div>
        </div>

        {/* Procrastination Hall of Fame */}
        {data.report.topProcrastinationActivities.length > 0 && (
          <div className="shame-card">
            <h2 className="text-lg font-semibold mb-4">🏆 Top Procrastination Activities</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.report.topProcrastinationActivities.slice(0, 6).map((a, i) => (
                <div
                  key={i}
                  className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{["🥇", "🥈", "🥉", "4️⃣", "5️⃣", "6️⃣"][i]}</span>
                    <span className="font-medium text-sm truncate">{a.activity}</span>
                  </div>
                  <div className="text-xs text-gray-400">
                    {Math.round(a.totalMinutes)} min · {a.occurrences}x
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-4 text-center text-xs text-gray-600 mt-8">
        Procrastination Shame Engine™ v1.0.0 · Built for the 2Fast2MCP Hackathon · Powered by Archestra AI
      </footer>
    </div>
  );
}
