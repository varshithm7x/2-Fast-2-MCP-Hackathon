import { useState, useEffect, useCallback } from "react";
import type { DashboardData } from "./api";
import { getDashboard, resetScore, subscribeToEvents } from "./api";
import { ShameMessageBar } from "./components/ShameMessageBar";
import { ActivityFeed } from "./components/ActivityFeed";
import { TaskList } from "./components/TaskList";
import { ScoreChart } from "./components/ScoreChart";
import { MomCountdown } from "./components/MomCountdown";
import { BreakdownPanel } from "./components/BreakdownPanel";
import { StatsBar } from "./components/StatsBar";
import { ScoreGauge } from "./components/ScoreGauge";
import { Terminal, Shield, Bell } from "lucide-react";
import { cn } from "./lib/utils";

export default function App() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const dashboard = await getDashboard();
      setData(dashboard);
      setError(null);
    } catch (err) {
      setError("Connection lost to Shame Engine Core.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    const unsubscribe = subscribeToEvents(({ score, message }) => {
      setData((prev) =>
        prev ? { ...prev, score, message } : prev
      );
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
           <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin"/>
           <div className="text-muted-foreground font-medium text-sm">Loading System...</div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full border border-destructive/20 bg-destructive/5 p-6 rounded-lg text-center">
          <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4 text-destructive">
             <Shield className="w-6 h-6" />
          </div>
          <h1 className="text-xl text-foreground font-semibold mb-2">System Error</h1>
          <p className="text-muted-foreground text-sm mb-6">{error}</p>
          <button
            onClick={fetchData}
            className="bg-destructive text-destructive-foreground px-6 py-2 rounded-md hover:bg-destructive/90 transition-colors w-full"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
             <div className="p-1.5 rounded-md bg-primary text-primary-foreground">
                <Terminal className="w-4 h-4" />
             </div>
             <div>
                <h1 className="text-sm font-semibold leading-none">Shame Engine</h1>
             </div>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-3 text-muted-foreground">
                <button className="p-2 hover:bg-accent rounded-full transition-colors relative">
                   <Bell className="w-4 h-4" />
                   {data.score.shameLevel > 2 && <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full" />}
                </button>
                <div className="w-px h-4 bg-border mx-1" />
                <div className="flex items-center gap-2">
                   <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center text-xs font-medium text-foreground">
                      {data.userName.charAt(0)}
                   </div>
                   <span className="text-sm hidden sm:inline">{data.userName}</span>
                </div>
             </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 space-y-8">
        <ShameMessageBar message={data.message} level={data.score.shameLevel} />
        
        <StatsBar 
           score={data.score} 
           streak={data.report ? Math.floor(data.report.totalMinutesProductive / 60) : 0} 
           tasksCompleted={data.tasks.filter(t => t.status === 'done' || t.status === 'completed').length} 
        />
        
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* Main Content Area */}
          <div className="md:col-span-12 lg:col-span-8 flex flex-col gap-6">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {/* Gauge & Momentum */}
                 <div className="flex flex-col gap-6">
                    <ScoreGauge score={data.score} />
                    {data.score.shameLevel >= 4 && (
                       <MomCountdown score={data.score} onAdmitDefeat={handleAdmitDefeat} />
                    )}
                 </div>
                 {/* Breakdown Panel */}
                 <BreakdownPanel breakdown={data.score.breakdown} />
             </div>

             
             <ScoreChart history={data.scoreHistory} />
          </div>

          {/* Right Sidebar: Activity Feed & Tasks */}
          <div className="md:col-span-12 lg:col-span-4 sticky top-20 flex flex-col gap-6 h-[calc(100vh-8rem)]">
            {/* Activity Log Panel */}
            <div className="rounded-xl border bg-card text-card-foreground shadow-sm flex-1 overflow-hidden flex flex-col min-h-[300px]">
               <div className="p-6 flex flex-col h-full">
                  <h3 className="text-sm font-medium text-muted-foreground mb-4 shrink-0">Activity Log</h3>
                  <div className="overflow-y-auto flex-1 pr-2">
                    <ActivityFeed activities={data.activities} />
                  </div>
               </div>
            </div>

            {/* Tasks Panel */}
            <div className="flex-1 min-h-[300px] overflow-hidden">
               <TaskList tasks={data.tasks} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
