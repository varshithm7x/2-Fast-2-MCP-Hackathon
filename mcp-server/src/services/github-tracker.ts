// ============================================================================
// Procrastination Shame Engine - GitHub Activity Tracker
// Deep integration with GitHub for commit tracking and code activity
// ============================================================================

import type { UserActivity } from "../types.js";
import { ActivityCategory } from "../types.js";
import { generateId } from "../utils/helpers.js";

interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: { date: string; name: string };
  };
  html_url: string;
}

interface GitHubRepo {
  name: string;
  full_name: string;
  updated_at: string;
  pushed_at: string;
}

/**
 * Fetch today's commits across all repos
 */
export async function fetchTodayCommits(token: string): Promise<UserActivity[]> {
  try {
    const headers = {
      Authorization: `Bearer ${token}`,
      "User-Agent": "ProcrastinationShameEngine",
    };

    // Get user info
    const userRes = await fetch("https://api.github.com/user", { headers });
    if (!userRes.ok) return [];
    const user = await userRes.json();

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const since = today.toISOString();

    // Get repos with recent pushes
    const reposRes = await fetch(
      `https://api.github.com/user/repos?sort=pushed&per_page=10`,
      { headers }
    );
    if (!reposRes.ok) return [];
    const repos = (await reposRes.json()) as GitHubRepo[];

    const activities: UserActivity[] = [];

    // Fetch commits from recent repos
    for (const repo of repos.slice(0, 5)) {
      // Only check repos pushed today
      if (new Date(repo.pushed_at) < today) continue;

      try {
        const commitsRes = await fetch(
          `https://api.github.com/repos/${repo.full_name}/commits?author=${(user as any).login}&since=${since}&per_page=20`,
          { headers }
        );
        if (!commitsRes.ok) continue;

        const commits = (await commitsRes.json()) as GitHubCommit[];

        for (const commit of commits) {
          activities.push({
            id: `github-commit-${commit.sha.slice(0, 8)}`,
            timestamp: new Date(commit.commit.author.date),
            durationMinutes: estimateCommitDuration(commit.commit.message),
            source: "git",
            category: ActivityCategory.PRODUCTIVE,
            title: `Commit: ${truncate(commit.commit.message, 60)}`,
            description: `${repo.full_name}: ${commit.commit.message}`,
            url: commit.html_url,
            evidence: {
              repo: repo.full_name,
              sha: commit.sha,
              message: commit.commit.message,
            },
          });
        }
      } catch {
        // Skip repos we can't access
      }
    }

    return activities;
  } catch (error) {
    console.error("Failed to fetch GitHub commits:", error);
    return [];
  }
}

/**
 * Fetch pull request activity
 */
export async function fetchPRActivity(token: string): Promise<UserActivity[]> {
  try {
    const headers = {
      Authorization: `Bearer ${token}`,
      "User-Agent": "ProcrastinationShameEngine",
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Search for PRs created/updated by user today
    const userRes = await fetch("https://api.github.com/user", { headers });
    if (!userRes.ok) return [];
    const user = (await userRes.json()) as any;

    const searchRes = await fetch(
      `https://api.github.com/search/issues?q=author:${user.login}+type:pr+updated:>=${today.toISOString().split("T")[0]}&per_page=20`,
      { headers }
    );
    if (!searchRes.ok) return [];

    const data = (await searchRes.json()) as any;
    return (data.items || []).map((pr: any) => ({
      id: `github-pr-${pr.number}-${generateId().slice(0, 4)}`,
      timestamp: new Date(pr.updated_at),
      durationMinutes: 30, // Estimate
      source: "git" as const,
      category: ActivityCategory.PRODUCTIVE,
      title: `PR: ${truncate(pr.title, 60)}`,
      description: `Pull Request #${pr.number}: ${pr.title}`,
      url: pr.html_url,
      evidence: { prNumber: pr.number, state: pr.state },
    }));
  } catch (error) {
    console.error("Failed to fetch PR activity:", error);
    return [];
  }
}

/**
 * Get coding streaks data (contribution graph equivalent)
 */
export async function getCodingStreak(token: string): Promise<{
  todayCommits: number;
  weekCommits: number;
  lastCommitAt: Date | null;
  isActivelyCoding: boolean;
}> {
  try {
    const headers = {
      Authorization: `Bearer ${token}`,
      "User-Agent": "ProcrastinationShameEngine",
    };

    const userRes = await fetch("https://api.github.com/user", { headers });
    if (!userRes.ok) return { todayCommits: 0, weekCommits: 0, lastCommitAt: null, isActivelyCoding: false };
    const user = (await userRes.json()) as any;

    // Get events
    const eventsRes = await fetch(
      `https://api.github.com/users/${user.login}/events?per_page=100`,
      { headers }
    );
    if (!eventsRes.ok) return { todayCommits: 0, weekCommits: 0, lastCommitAt: null, isActivelyCoding: false };

    const events = (await eventsRes.json()) as any[];
    const pushEvents = events.filter((e: any) => e.type === "PushEvent");

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);

    let todayCommits = 0;
    let weekCommits = 0;
    let lastCommitAt: Date | null = null;

    for (const event of pushEvents) {
      const eventDate = new Date(event.created_at);
      const commitCount = event.payload?.commits?.length || 1;

      if (!lastCommitAt || eventDate > lastCommitAt) {
        lastCommitAt = eventDate;
      }

      if (eventDate >= today) {
        todayCommits += commitCount;
      }
      if (eventDate >= weekAgo) {
        weekCommits += commitCount;
      }
    }

    // "Actively coding" = committed in the last 2 hours
    const isActivelyCoding = lastCommitAt
      ? (Date.now() - lastCommitAt.getTime()) < 7200000
      : false;

    return { todayCommits, weekCommits, lastCommitAt, isActivelyCoding };
  } catch (error) {
    console.error("Failed to get coding streak:", error);
    return { todayCommits: 0, weekCommits: 0, lastCommitAt: null, isActivelyCoding: false };
  }
}

/** Estimate how long a commit took based on message */
function estimateCommitDuration(message: string): number {
  const msg = message.toLowerCase();
  if (msg.includes("fix typo") || msg.includes("formatting")) return 5;
  if (msg.includes("merge")) return 10;
  if (msg.includes("feat") || msg.includes("feature")) return 45;
  if (msg.includes("refactor")) return 60;
  if (msg.includes("fix") || msg.includes("bug")) return 30;
  if (msg.includes("test")) return 20;
  if (msg.includes("docs") || msg.includes("readme")) return 15;
  if (msg.includes("wip")) return 15;
  return 25; // Default estimate
}

/** Truncate a string to a max length */
function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + "...";
}
