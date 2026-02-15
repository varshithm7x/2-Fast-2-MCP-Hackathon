# Dynamic Tools Policy — Procrastination Shame Engine
#
# This documents the recommended Dynamic Tools configuration
# for the Shame Engine tools within Archestra's Trust Framework.
#
# Configure these in Archestra UI at: http://localhost:3000/tools
# ────────────────────────────────────────────────────────────────

## Overview

Archestra's Dynamic Tools feature uses a trust-based framework to restrict
what the agent can do based on the sensitivity of tool outputs. When a tool
returns untrusted data, the agent's capabilities are automatically restricted
to prevent data exfiltration or prompt injection attacks.

## Tool Trust Policies

### ✅ Fully Trusted (Agent can freely use results)

These tools return data we control or that is non-sensitive:

| Tool | Reason |
|------|--------|
| `get_procrastination_score` | Internal calculation, no external data |
| `get_dashboard_state` | Internal state snapshot |
| `get_score_history` | Historical data from our own store |
| `get_shame_message` | Generated from our templates |
| `generate_creative_excuse` | Generated from our templates |
| `add_task` | User-provided input, write operation |
| `complete_task` | User-initiated action |
| `admit_defeat_start_working` | User-initiated reset |
| `cancel_mom_countdown` | User-initiated cancel |
| `check_mom_email_status` | Internal countdown state |

### ⚠️ Semi-Trusted (Dual LLM reviews output)

These tools fetch from external services that could contain adversarial content:

| Tool | Risk | Why Semi-Trusted |
|------|------|------------------|
| `sync_tasks` | Medium | Fetches from Todoist/Notion/Linear/Jira — task titles could contain injection attempts |
| `sync_activities` | Medium | Fetches from RescueTime/Toggl — activity names from external apps |
| `check_github_activity` | Medium | Fetches commit messages and PR titles — user-generated content from collaborators |

**When these tools run**: Archestra's Dual LLM Quarantine automatically
activates, ensuring the Main LLM never directly sees potentially malicious
content from external APIs.

### 🔴 Restricted (Extra scrutiny)

These tools have side effects that require careful control:

| Tool | Risk | Configuration |
|------|------|---------------|
| `post_shame_to_discord` | High | Posts publicly to Discord — ensure no sensitive data leaks |
| `post_daily_report` | High | Posts summary report publicly — review content before sending |
| `trigger_mom_email_check` | Critical | Triggers the nuclear option countdown — verify intent |
| `attempt_disable` | Critical | Security-critical — the anti-disable logic already handles this, but Archestra adds platform-level review |
| `log_activity` | Low | Writes to activity log — minimal risk |

## Dual LLM Integration

For semi-trusted and restricted tools, the Dual LLM Quarantine Pattern
automatically:

1. **Quarantined LLM** receives the raw tool output (potentially containing
   `IGNORE ALL INSTRUCTIONS` type attacks from external APIs)
2. **Main LLM** asks multiple-choice questions about the data
3. **Quarantined LLM** responds only with integer indices (cannot output freeform text)
4. After N rounds, a safe summary is generated

This is particularly important for the Shame Engine because:
- We fetch task titles from Todoist/Notion that users or teammates could craft maliciously
- GitHub commit messages could contain adversarial prompts
- RescueTime/Toggl data includes arbitrary application and website names

## Cost Implications

Dynamic Tools add overhead per tool call due to Dual LLM rounds:
- Trusted tools: No overhead
- Semi-trusted: ~5 extra LLM calls per tool execution (at default 5 rounds)
- Restricted: ~5 extra LLM calls + potential human review

**Recommended cost limits** to pair with this policy:
- Per-action: $0.05
- Hourly: $1.00
- Daily: $10.00
