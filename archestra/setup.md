# Archestra Platform Setup — Procrastination Shame Engine

This guide walks you through configuring the Shame Engine as a **core Archestra project** — registering the MCP server, creating the agent, configuring security, and exposing it via MCP Gateway.

---

## Prerequisites

- Docker running on your machine
- The Shame Engine MCP server running (via `docker compose up` or locally)
- An LLM API key (OpenAI, Anthropic, etc.)

---

## Step 1 — Launch Archestra Platform

```bash
docker compose up -d
```

This starts:
| Service | URL | Purpose |
|---------|-----|---------|
| **Archestra UI** | http://localhost:3000 | Chat, Agent Builder, Registry, Gateway |
| **Archestra API** | http://localhost:9000 | Platform backend |
| **Shame Engine MCP** | http://localhost:8080/mcp | Our MCP server |
| **Dashboard** | http://localhost:3001 | Custom shame dashboard |

Open **http://localhost:3000** — you'll see the Archestra Platform UI.

---

## Step 2 — Add LLM API Key

1. Go to **Settings** (gear icon)
2. Navigate to **LLM Configuration**
3. Add your preferred LLM provider API key:
   - **OpenAI**: `sk-...`
   - **Anthropic**: `sk-ant-...`
   - Or any supported provider
4. Save

---

## Step 3 — Register the MCP Server in Private Registry

The Private MCP Registry is where Archestra discovers and manages MCP servers.

1. Go to **MCP Registry** in the sidebar
2. Click **Add MCP Server**
3. Select **Remote** server type (HTTP/SSE)
4. Configure:
   - **Name**: `Procrastination Shame Engine`
   - **URL**: `http://shame-engine:8080/mcp` (Docker network) or `http://host.docker.internal:8080/mcp` (if running locally)
   - **Transport**: Streamable HTTP
   - **Description**: `AI agent that tracks productivity, calculates procrastination scores, and escalates shame from gentle nudges to nuclear options.`
5. Click **Save**

> **Note**: If running the MCP server locally (not in Docker), use `http://host.docker.internal:8080/mcp` so the Archestra container can reach your host machine. On Linux, you may need `--add-host host.docker.internal:host-gateway` (already handled by compose).

Archestra will automatically detect all 18 tools exposed by the server:
- `get_procrastination_score`, `get_dashboard_state`, `get_score_history`
- `sync_tasks`, `add_task`, `complete_task`
- `sync_activities`, `log_activity`, `check_github_activity`
- `get_shame_message`, `post_shame_to_discord`, `post_daily_report`
- `generate_creative_excuse`, `check_mom_email_status`
- `trigger_mom_email_check`, `cancel_mom_countdown`
- `attempt_disable`, `admit_defeat_start_working`

---

## Step 4 — Create the Shame Engine Agent

1. Go to **Agents** in the sidebar
2. Click **Create New Agent**
3. Configure:
   - **Name**: `Procrastination Shame Engine`
   - **Description**: `A merciless but humorous AI that tracks your productivity and shames you into working.`
   - **System Prompt**: Copy the content from [`agent-system-prompt.md`](./agent-system-prompt.md) in this directory
4. In the **Tools** section:
   - Click **Add Tools**
   - Select the `Procrastination Shame Engine` MCP server
   - Enable **all 18 tools**
5. Click **Save**

---

## Step 5 — Configure Dynamic Tools (Security)

Dynamic Tools restrict what tools can do based on trust levels. This is how we implement the anti-disable security at the platform level.

1. Go to **Dynamic Tools** (http://localhost:3000/tools)
2. Find the Shame Engine's tools
3. Configure **Trusted Data Policies**:

| Tool | Trust Level | Policy |
|------|-------------|--------|
| `get_procrastination_score` | Trusted | Read-only scoring data |
| `sync_tasks` | Trusted | Reads from user's task systems |
| `sync_activities` | Trusted | Reads from user's activity sources |
| `post_shame_to_discord` | Semi-trusted | Can write to Discord but no sensitive data |
| `trigger_mom_email_check` | Untrusted | External email — needs Dual LLM review |
| `attempt_disable` | Untrusted | Security-critical — always review |
| `admit_defeat_start_working` | Trusted | User explicitly invoked |

4. For untrusted tools, Archestra's **Dual LLM** will automatically quarantine the tool output and review it before the agent processes it.

---

## Step 6 — Enable Dual LLM Security

The Dual LLM pattern protects against prompt injection in tool outputs (e.g., malicious content in fetched web pages, emails, or external API responses).

1. Go to **Dual LLM** configuration (http://localhost:3000/dual-llm)
2. **Enable** the toggle
3. Set **Max Rounds**: `5` (good balance of safety vs cost)
4. The default prompts work well, but you can customize:
   - **Main Agent Prompt**: How the privileged LLM asks questions about tool data
   - **Quarantined Agent Prompt**: How the restricted LLM processes untrusted data
   - **Summary Prompt**: How the safe summary is generated

This ensures that if the Shame Engine fetches external data (GitHub, Todoist, RescueTime) that contains adversarial content, it's safely quarantined before the agent processes it.

---

## Step 7 — Set Cost Limits

1. Go to **Costs & Limits** in settings
2. Configure spending caps:
   - **Per-action limit**: $0.05
   - **Hourly limit**: $1.00
   - **Daily limit**: $10.00
3. Enable **alerts** at 80% threshold

This prevents the Shame Engine from running up LLM costs with its periodic score checks.

---

## Step 8 — Create MCP Gateway (Optional — Expose to External Clients)

If you want Claude, ChatGPT, or other MCP clients to use the Shame Engine:

1. Go to **MCP Gateways** in the sidebar
2. Click **Create New Gateway**
3. Name it: `Shame Engine Gateway`
4. In **Tools**, assign the Shame Engine MCP server tools
5. Click **Save**
6. Click the **Connect** icon to get:
   - **MCP endpoint URL**: `http://localhost:9000/v1/mcp/<gateway_id>`
   - **Bearer token**: For authentication

### Connect from Claude Desktop

Add to `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "shame-engine": {
      "url": "http://localhost:9000/v1/mcp/<gateway_id>",
      "headers": {
        "Authorization": "Bearer archestra_<your_token>"
      }
    }
  }
}
```

### Connect via A2A (Agent-to-Agent)

```bash
# Discover agent capabilities
curl -s http://localhost:9000/v1/a2a/<agent_id>/.well-known/agent.json

# Send a message to the agent
curl -X POST http://localhost:9000/v1/a2a/<agent_id> \
  -H "Authorization: Bearer archestra_<token>" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "1",
    "method": "message/send",
    "params": {
      "message": {
        "parts": [{"kind": "text", "text": "What is my procrastination score right now?"}]
      }
    }
  }'
```

---

## Step 9 — Chat with Your Agent

1. Go to the **Chat** page in Archestra UI (http://localhost:3000)
2. Select the **Procrastination Shame Engine** agent
3. Try these prompts:
   - *"What's my procrastination score?"*
   - *"Sync my tasks from all sources"*
   - *"Show me what I've been doing today"*
   - *"Shame me. I deserve it."*
   - *"How close am I to the mom email?"*
   - *"I admit defeat. I'll start working now."*

The agent will use the tools from your MCP server, secured by Dynamic Tools and Dual LLM, with full observability in the Archestra dashboard.

---

## Step 10 — Monitor with Observability

Archestra provides built-in observability:

1. **Metrics**: Track tool call frequency, latency, error rates
2. **Traces**: See the full execution flow of agent interactions
3. **Logs**: View detailed logs for debugging
4. **Cost tracking**: Monitor LLM spending per agent/tool

All accessible from the Archestra UI sidebar.

---

## Architecture (Archestra-Native)

```
┌──────────────────────────────────────────────────────────────┐
│                   Archestra Platform                          │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Chat UI ─── Agent Builder ─── MCP Gateway ─── A2A     │ │
│  └───────────────────┬─────────────────────────────────────┘ │
│                      │                                        │
│  ┌───────────────────▼─────────────────────────────────────┐ │
│  │  Shame Engine Agent                                      │ │
│  │  System Prompt + 18 MCP Tools assigned                   │ │
│  └───────────────────┬─────────────────────────────────────┘ │
│                      │                                        │
│  ┌─────────┐  ┌──────▼──────┐  ┌───────────┐  ┌──────────┐ │
│  │ Dynamic  │  │ Dual LLM   │  │ Cost      │  │Observ-   │ │
│  │ Tools    │  │ Quarantine  │  │ Limits    │  │ability   │ │
│  │ Security │  │ Pattern     │  │ $10/day   │  │Metrics   │ │
│  └─────────┘  └─────────────┘  └───────────┘  └──────────┘ │
│                      │                                        │
│         Private MCP Registry                                  │
│         ┌────────────▼───────────────┐                       │
│         │  Remote MCP Server         │                       │
│         │  http://shame-engine:8080  │                       │
│         └────────────────────────────┘                       │
└──────────────────────────────────────────────────────────────┘
                       │
          MCP Streamable HTTP
                       │
┌──────────────────────▼───────────────────────────────────────┐
│              Shame Engine MCP Server                          │
│  ┌─────────────┐ ┌──────────────┐ ┌───────────────────┐    │
│  │ Score Engine │ │ Msg Generator│ │ Activity Monitor  │    │
│  ├─────────────┤ ├──────────────┤ ├───────────────────┤    │
│  │Task Tracker  │ │Discord Shamer│ │ GitHub Tracker    │    │
│  ├─────────────┤ ├──────────────┤ ├───────────────────┤    │
│  │Email Service │ │ Anti-Disable │ │ Dashboard API     │    │
│  └─────────────┘ └──────────────┘ └───────────────────┘    │
└──────────────────┬───────────────────────────────────────────┘
                   │ REST API + SSE
┌──────────────────▼───────────────────────────────────────────┐
│              Dashboard (React + Tailwind)                      │
│  Score Gauge · Activity Feed · Task List · Charts · Mom       │
│  http://localhost:3001                                         │
└──────────────────────────────────────────────────────────────┘
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Archestra can't reach shame-engine | Ensure both containers are on the same Docker network. Use `http://shame-engine:8080/mcp` as the URL in MCP Registry. |
| Tools not detected | Verify the MCP server is running: `curl http://localhost:8080/mcp` should respond. |
| "Missing credentials" error | Go to MCP Registry and re-authenticate the Shame Engine server. |
| Port 3000 conflict | Archestra UI uses port 3000. The dashboard is on port 3001. |
| Linux Docker networking | Add `--add-host host.docker.internal:host-gateway` if connecting from Archestra to host-run MCP server. |
