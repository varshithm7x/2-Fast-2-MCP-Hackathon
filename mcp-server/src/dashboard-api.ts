// ============================================================================
// Procrastination Shame Engine - Dashboard REST API
// Serves live data to the web dashboard frontend
// ============================================================================

import express from "express";
import cors from "cors";
import { loadConfig } from "./config.js";
import {
  fetchAllTasks,
  getAllTasks,
} from "./services/task-tracker.js";
import {
  fetchAllActivities,
  getContextSwitchCount,
  getTodayActivities,
} from "./services/activity-monitor.js";
import {
  calculateProcrastinationScore,
  getScoreHistory,
  resetScore,
} from "./services/score-engine.js";
import {
  generateShameMessage,
} from "./services/message-generator.js";
import {
  generateReport,
} from "./services/discord-shamer.js";
import {
  getMomCountdownStatus,
  cancelMomCountdown,
} from "./services/email-service.js";
import {
  canDisableEngine,
  getDisableAttemptLog,
} from "./services/anti-disable.js";

/**
 * Start the dashboard API server
 */
export async function startDashboardServer(port: number): Promise<void> {
  const app = express();
  app.use(cors());
  app.use(express.json());

  const config = loadConfig();

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", engine: "procrastination-shame-engine", version: "1.0.0" });
  });

  // Get current procrastination score
  app.get("/api/score", async (_req, res) => {
    try {
      const tasks = await fetchAllTasks(config.taskSources);
      const activities = await fetchAllActivities(config.activitySources);
      const switches = getContextSwitchCount();
      const score = calculateProcrastinationScore(activities, tasks, switches);
      const message = generateShameMessage(score, tasks, activities, switches);
      res.json({ score, message });
    } catch (error) {
      res.status(500).json({ error: "Failed to calculate score" });
    }
  });

  // Get score history for charts
  app.get("/api/score/history", (_req, res) => {
    const limit = parseInt((_req.query.limit as string) || "100");
    const history = getScoreHistory().slice(-limit);
    res.json({ history });
  });

  // Get all tasks
  app.get("/api/tasks", async (_req, res) => {
    try {
      const tasks = await fetchAllTasks(config.taskSources);
      res.json({ tasks });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  // Get today's activities
  app.get("/api/activities", async (_req, res) => {
    try {
      const activities = await fetchAllActivities(config.activitySources);
      res.json({ activities });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch activities" });
    }
  });

  // Get full dashboard state
  app.get("/api/dashboard", async (_req, res) => {
    try {
      const tasks = await fetchAllTasks(config.taskSources);
      const activities = await fetchAllActivities(config.activitySources);
      const switches = getContextSwitchCount();
      const score = calculateProcrastinationScore(activities, tasks, switches);
      const message = generateShameMessage(score, tasks, activities, switches);
      const history = getScoreHistory().slice(-100);
      const momCountdown = config.momEmail ? getMomCountdownStatus(config.momEmail) : null;
      const report = generateReport(activities, tasks, history, "daily");

      res.json({
        score,
        message,
        tasks,
        activities: activities.slice(-30),
        scoreHistory: history,
        momCountdown,
        report,
        contextSwitches: switches,
        userName: config.userName,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get dashboard state" });
    }
  });

  // Reset score (Admit Defeat button)
  app.post("/api/score/reset", (_req, res) => {
    resetScore();
    const momResult = config.momEmail ? cancelMomCountdown() : null;
    res.json({
      success: true,
      message: "Score reset! Now prove you mean it.",
      momCountdownCancelled: !!momResult,
    });
  });

  // Get mom email status
  app.get("/api/mom-status", (_req, res) => {
    if (!config.momEmail) {
      res.json({ configured: false });
      return;
    }
    const status = getMomCountdownStatus(config.momEmail);
    res.json({ configured: true, ...status });
  });

  // Get disable attempts
  app.get("/api/disable-attempts", (_req, res) => {
    const attempts = getDisableAttemptLog();
    const state = canDisableEngine(config, getAllTasks());
    res.json({ attempts, state });
  });

  // Get productivity report
  app.get("/api/report/:period", async (req, res) => {
    try {
      const period = req.params.period as "daily" | "weekly" | "monthly";
      const tasks = await fetchAllTasks(config.taskSources);
      const activities = await fetchAllActivities(config.activitySources);
      const scores = getScoreHistory();
      const report = generateReport(activities, tasks, scores, period);
      res.json({ report });
    } catch (error) {
      res.status(500).json({ error: "Failed to generate report" });
    }
  });

  // SSE endpoint for real-time updates
  app.get("/api/events", (req, res) => {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    // Send score updates every 30 seconds
    const interval = setInterval(async () => {
      try {
        const tasks = await fetchAllTasks(config.taskSources);
        const activities = await fetchAllActivities(config.activitySources);
        const switches = getContextSwitchCount();
        const score = calculateProcrastinationScore(activities, tasks, switches);
        const message = generateShameMessage(score, tasks, activities, switches);

        res.write(`data: ${JSON.stringify({ type: "score_update", score, message })}\n\n`);
      } catch {
        // Silently handle errors in SSE
      }
    }, 30000);

    req.on("close", () => {
      clearInterval(interval);
    });
  });

  return new Promise((resolve) => {
    app.listen(port, () => {
      resolve();
    });
  });
}
