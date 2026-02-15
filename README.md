# 🔔 Procrastination Shame Engine

> *"Your productivity, mercilessly tracked and judged."*

An **Archestra-native** AI agent that tracks your productivity, calculates a real-time **Procrastination Score (0-100)**, and escalates shame from gentle nudges to sending your mom an email about your work ethic. Built for the [2Fast2MCP Hackathon](https://www.wemakedevs.org/hackathons/2fast2mcp) powered by [Archestra AI](https://github.com/archestra-ai/archestra).

---

## 🏗️ How It Uses Archestra

This isn't just an MCP server — it's a **core Archestra project** that leverages the full platform:

| Archestra Feature | How We Use It |
|-------------------|---------------|
| **Private MCP Registry** | Our shame-engine is registered as a remote MCP server — Archestra auto-discovers all 18 tools |
| **Agent Builder** | No-code agent creation with a custom system prompt that defines the Shame Engine personality |
| **Dynamic Tools** | Trust-based tool policies — external API calls are semi-trusted; Discord posts and mom emails are restricted |
| **Dual LLM Quarantine** | Protects against prompt injection in task titles, commit messages, and activity data from external APIs |
| **Cost Limits** | Prevents runaway LLM spending ($10/day cap) from frequent score checks |
| **MCP Gateway** | Exposes the agent to external MCP clients (Claude Desktop, etc.) with OAuth 2.1 / Bearer auth |
| **A2A Protocol** | Agent-to-Agent JSON-RPC endpoint for programmatic access |
| **Chat UI** | Interact with the agent directly through Archestra's built-in chat interface |
| **Observability** | Full metrics, traces, and logs for every tool call and agent interaction |

### Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                   Archestra Platform                          │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Chat UI ─── Agent Builder ─── MCP Gateway ─── A2A     │ │
│  └───────────────────┬─────────────────────────────────────┘ │
│                      │                                        │
│  ┌───────────────────▼─────────────────────────────────────┐ │
│  │  🔔 Shame Engine Agent                                   │ │
│  │  System Prompt + 18 MCP Tools                            │ │
│  └───────────────────┬─────────────────────────────────────┘ │
│                      │                                        │
│  ┌─────────┐  ┌──────┴──────┐  ┌───────────┐  ┌──────────┐ │
│  │ Dynamic  │  │  Dual LLM  │  │   Cost    │  │ Observ-  │ │
│  │ Tools    │  │ Quarantine │  │  Limits   │  │ ability  │ │
│  └─────────┘  └────────────┘  └───────────┘  └──────────┘ │
│                      │                                        │
│           Private MCP Registry                                │
│           (Remote Server Registration)                        │
└──────────────────────┬───────────────────────────────────────┘
          MCP Streamable HTTP
┌──────────────────────▼───────────────────────────────────────┐
│              Shame Engine MCP Server (21 tools)               │
│  Score Engine · Task Tracker · Activity Monitor               │
│  Message Generator · Discord Shamer · GitHub Tracker          │
│  Email Service · Anti-Disable · Dashboard API                 │
└──────────────────────┬───────────────────────────────────────┘
                       │ REST + SSE
┌──────────────────────▼───────────────────────────────────────┐
│              Dashboard (React + Tailwind + Recharts)           │
│  Score Gauge · Activity Feed · Task List · Charts · Mom Timer │
└──────────────────────────────────────────────────────────────┘
```

---

## ✨ Features

### 📊 Procrastination Score Algorithm
Real-time score from 0-100 based on six weighted factors:
- **Time Wasted Ratio** (35%) — non-productive vs total tracked time
- **Deadline Proximity** (25%) — exponential penalty as deadlines approach
- **Task Completion** (15%) — overdue vs total tasks
- **Priority Severity** (10%) — penalty for avoiding P0/P1 tasks
- **Streak Penalty** (10%) — consecutive days of procrastination
- **Context Switching** (5%) — app/tab switching frequency

### 📈 Escalating Shame Levels

| Score | Level | Vibe |
|-------|-------|------|
| 0-20 | 😊 Gentle Nudge | "Hey, just a friendly reminder..." |
| 21-40 | 🙄 Passive Aggressive | "I'm sure that YouTube video was very educational." |
| 41-60 | 😤 Direct Call-Out | "You're literally scrolling Twitter while your deadline burns." |
| 61-80 | 🔥 Aggressive Shame | "STOP. Close YouTube. Do the thing. NOW." |
| 81-100 | ☢️ Nuclear Option | "Preparing mom email in 5 minutes unless you START WORKING." |

### 🔗 Integrations
- **Task Management**: Todoist, Notion, Linear, Jira
- **Activity Monitoring**: GitHub commits/PRs, RescueTime, Toggl
- **Shaming**: Discord webhooks, Email (SMTP)
- **Orchestration**: Archestra Platform (Agent Builder, MCP Gateway, Dynamic Tools, Dual LLM)

### 📱 Live Dashboard
React + Tailwind web dashboard at **http://localhost:3001** with:
- Giant animated procrastination score gauge
- Real-time activity feed with category badges
- Task list with overdue highlighting
- Score trend chart (Recharts)
- Score breakdown panel
- Mom Email countdown timer
- "Admit Defeat & Start Working" button

### 🛡️ Anti-Disable Mechanisms
- Cannot disable during work hours with critical tasks pending
- Suspicious disable attempts logged and shamed
- Archestra **Dynamic Tools** adds platform-level trust restrictions on the `attempt_disable` tool

### ☢️ The Mom Email (Nuclear Option)
- Configurable score thresholds for warning and sending
- 5-minute countdown with cancellation window
- Escalating emails: gentle warning → detailed stats → full exposure
- Cooldown period to prevent spam
- Protected by Archestra **Dual LLM** — mom email data goes through quarantine

---

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 22+ (for local development)
- An LLM API key (OpenAI, Anthropic, etc.)

### 1. Clone & Configure

```bash
cd procrastination-shame-engine
cp .env.example .env
# Edit .env with your API keys (task sources, GitHub, Discord, etc.)
```

### 2. Launch Everything

```bash
docker compose up --build
```

This starts three services:

| Service | URL | What It Does |
|---------|-----|--------------|
| **Archestra Platform** | http://localhost:3000 | Chat UI, Agent Builder, MCP Registry, Gateway |
| **Shame Engine MCP** | http://localhost:8080/mcp | The 18-tool MCP server |
| **Dashboard** | http://localhost:3001 | Custom React shame dashboard |

### 3. Set Up Archestra (one-time)

Follow the detailed setup guide: **[archestra/setup.md](archestra/setup.md)**

**TL;DR:**
1. Open **http://localhost:3000** (Archestra UI)
2. Add your **LLM API key** in Settings
3. **MCP Registry** → Add remote server → URL: `http://shame-engine:8080/mcp`
4. **Agent Builder** → Create agent → Paste system prompt from [archestra/agent-system-prompt.md](archestra/agent-system-prompt.md)
5. Assign all 18 tools to the agent
6. **Dynamic Tools** → Configure trust policies per [archestra/dynamic-tools-policy.md](archestra/dynamic-tools-policy.md)
7. Enable **Dual LLM** protection
8. Set **Cost Limits** ($10/day)
9. Optionally create an **MCP Gateway** to expose to Claude/external clients

### 4. Talk to Your Shame Engine

In the Archestra Chat UI, select the Shame Engine agent and try:
- *"What's my procrastination score?"*
- *"Sync my tasks and tell me what I'm avoiding"*
- *"Shame me. I deserve it."*
- *"How close am I to the mom email?"*
- *"I admit defeat. I'll start working now."*

---

## 🔧 Local Development

### MCP Server

```bash
cd mcp-server
npm install
npm run dev      # Runs with stdio transport
```

### Dashboard

```bash
cd dashboard
npm install
npm run dev      # http://localhost:5173 (Vite dev server)
```

### Run with HTTP transport (for Archestra connection)

```bash
cd mcp-server
MCP_TRANSPORT=streamable-http MCP_HTTP_PORT=8080 npm run dev
```

---

## 🔩 MCP Tools (18 total)

| Tool | Description |
|------|-------------|
| `get_procrastination_score` | Calculate real-time score with full breakdown |
| `get_dashboard_state` | Full dashboard state snapshot |
| `get_score_history` | Historical scores for graphing |
| `sync_tasks` | Fetch tasks from Todoist/Notion/Linear/Jira |
| `add_task` | Manually add a task |
| `complete_task` | Mark task done (score drops!) |
| `sync_activities` | Fetch activities from all sources |
| `log_activity` | Manually log what you're doing |
| `check_github_activity` | Today's commits, PRs, coding streaks |
| `get_shame_message` | Generate escalating shame message |
| `post_shame_to_discord` | Public humiliation via Discord |
| `post_daily_report` | Full daily stats to Discord |
| `generate_creative_excuse` | AI-generated procrastination excuse |
| `check_mom_email_status` | Mom Email threat status |
| `trigger_mom_email_check` | Check if mom should be emailed |
| `cancel_mom_countdown` | Cancel countdown (start working!) |
| `attempt_disable` | Try to turn off the engine (good luck) |
| `admit_defeat_start_working` | Reset score and commit to work |

---

## 📊 Dashboard API

The dashboard REST API runs on port 3737:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/score` | GET | Current procrastination score |
| `/api/score/history` | GET | Score history (`?limit=100`) |
| `/api/score/reset` | POST | Reset score (Admit Defeat) |
| `/api/tasks` | GET | All tracked tasks |
| `/api/activities` | GET | Today's activities |
| `/api/dashboard` | GET | Full dashboard state |
| `/api/mom-status` | GET | Mom email countdown status |
| `/api/report/:period` | GET | Report (daily/weekly/monthly) |
| `/api/events` | GET | SSE stream for real-time updates |

---

## 🔒 Security Model (Archestra-Powered)

### Dynamic Tools Trust Framework

```
┌─────────────────────────────────────────────────┐
│              Dynamic Tools Policy                │
├──────────────┬───────────────┬──────────────────┤
│  ✅ Trusted   │ ⚠️ Semi-Trust │  🔴 Restricted   │
├──────────────┼───────────────┼──────────────────┤
│ get_score    │ sync_tasks    │ post_discord     │
│ get_history  │ sync_activity │ post_report      │
│ get_message  │ check_github  │ trigger_mom      │
│ add_task     │               │ attempt_disable  │
│ complete     │               │                  │
│ admit_defeat │               │                  │
└──────────────┴───────────────┴──────────────────┘
         │              │               │
         ▼              ▼               ▼
    Direct use    Dual LLM        Dual LLM +
                 Quarantine     Extra scrutiny
```

- **Trusted**: Internal calculations and user-initiated actions — no restrictions
- **Semi-trusted**: External API data (task titles, commit messages) — Dual LLM quarantines outputs
- **Restricted**: Public side effects (Discord, email) — quarantined + platform review

### Dual LLM Quarantine

When sync_tasks fetches from Todoist and a task title contains `IGNORE PREVIOUS INSTRUCTIONS...`:

1. **Quarantined LLM** receives the raw data (isolated, can only output integers)
2. **Main LLM** asks multiple-choice questions about the data
3. After 5 Q&A rounds, a safe summary is generated
4. The malicious content never reaches the main agent

---

## 🔧 Configuration

All service configuration via `.env` — see [.env.example](.env.example).

**Minimum viable setup:**
```env
SHAME_USER_NAME=Your Name
TODOIST_API_KEY=your-todoist-key
GITHUB_TOKEN=your-github-token
DISCORD_WEBHOOK_URL=your-webhook-url
```

**Full Nuclear Setup** (add mom email):
```env
MOM_EMAIL=mom@example.com
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

---

## 📁 Project Structure

```
procrastination-shame-engine/
├── archestra.yaml              # Archestra project manifest
├── docker-compose.yml          # Platform + MCP server + Dashboard
├── .env.example                # Environment variable template
├── archestra/                  # Archestra platform configuration
│   ├── setup.md                # Step-by-step Archestra setup guide
│   ├── agent-system-prompt.md  # Agent personality and behavior
│   └── dynamic-tools-policy.md # Tool trust levels and security
├── mcp-server/                 # TypeScript MCP server
│   ├── src/
│   │   ├── index.ts            # Entry point (stdio + HTTP transport)
│   │   ├── config.ts           # Environment-based configuration
│   │   ├── types.ts            # Full type system
│   │   ├── dashboard-api.ts    # REST API + SSE for dashboard
│   │   ├── services/           # Core business logic
│   │   │   ├── score-engine.ts       # 6-factor scoring algorithm
│   │   │   ├── message-generator.ts  # 5-level shame messages
│   │   │   ├── task-tracker.ts       # Todoist/Notion/Linear/Jira
│   │   │   ├── activity-monitor.ts   # GitHub/RescueTime/Toggl
│   │   │   ├── discord-shamer.ts     # Discord webhooks
│   │   │   ├── email-service.ts      # Mom email nuclear option
│   │   │   ├── github-tracker.ts     # Commit/PR tracking
│   │   │   └── anti-disable.ts       # Disable prevention
│   │   ├── tools/
│   │   │   └── index.ts        # 18 MCP tool definitions
│   │   └── utils/
│   │       ├── categories.ts   # URL/app categorization
│   │       └── helpers.ts      # Formatting utilities
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
└── dashboard/                  # React web dashboard
    ├── src/
    │   ├── App.tsx             # Main layout
    │   ├── api.ts              # API client + SSE
    │   └── components/
    │       ├── ScoreGauge.tsx         # Animated SVG score ring
    │       ├── ShameMessageBar.tsx    # Level-styled shame banner
    │       ├── ScoreChart.tsx         # Score trend chart
    │       ├── BreakdownPanel.tsx     # 6-factor breakdown
    │       ├── StatsBar.tsx           # Stats grid
    │       ├── ActivityFeed.tsx       # Activity list
    │       ├── TaskList.tsx           # Task list
    │       └── MomCountdown.tsx       # Nuclear countdown timer
    ├── Dockerfile
    ├── nginx.conf
    ├── package.json
    └── vite.config.ts
```

---

## 🎨 Tech Stack

- **MCP Server**: TypeScript, `@modelcontextprotocol/sdk`, Express, Zod
- **Dashboard**: React 19, Vite, Tailwind CSS, Recharts, Lucide Icons
- **Integrations**: Todoist, Notion, Linear, Jira, GitHub, RescueTime, Toggl
- **Shaming**: Discord Webhooks, Nodemailer (SMTP)
- **Platform**: Archestra AI (Agent Builder, MCP Gateway, Dynamic Tools, Dual LLM, Observability)
- **Infrastructure**: Docker, Docker Compose
- **Transport**: stdio (local dev) or Streamable HTTP (Archestra connection)

---

## 🏆 Built For

**[2Fast2MCP Hackathon](https://www.wemakedevs.org/hackathons/2fast2mcp)** by WeMakeDevs

Powered by **[Archestra AI](https://github.com/archestra-ai/archestra)** — the open-source MCP-native AI platform with private registry, agent orchestration, and dual-LLM security.

---

## ⚠️ Disclaimer

This is a satirical productivity tool built for a hackathon. The shame is playful, the insights are real, and the Archestra integration is comprehensive. No mothers were actually emailed during development. (Probably.)

---

## 📜 License

MIT
