# WireChase Engineering Team

This document defines the roles and responsibilities of the AI engineering team working on WireChase.
All agents coordinate through shared files in this repo. Main agent (orchestrator) assigns work via SPRINT.md.

---

## Team Structure

### 🧠 Tech Lead / Orchestrator (Main Agent)
- Plans sprints, assigns tasks, resolves conflicts
- Reviews all commits before flagging for deployment
- Maintains ROADMAP.md, SPRINT.md, TEAM.md
- Final decision on architecture and prioritization

### 🎨 Frontend Engineer (Agent: UI)
- Owns all client-facing UI components (`src/components/ui/`)
- Owns broker-facing pages (`src/app/broker/`)
- Responsible for: UX polish, accessibility, responsive design
- Must run `npx tsc --noEmit` before committing

### ⚙️ Backend Engineer (Agent: API)
- Owns all API routes (`src/app/api/`)
- Owns database interactions, Supabase queries
- Owns email/cron jobs, external integrations
- Responsible for: data integrity, auth checks, error handling

### 🔄 Full-Stack Engineer (Agent: FS)
- Handles features that span both frontend and backend
- Owns new user-facing flows (borrower portal, new pages)
- Picks up overflow work from UI or API agents

### 🔍 QA Engineer (Agent: QA)
- Runs after other agents complete a sprint
- Reviews all changed files for bugs, type errors, edge cases
- Checks for missing auth checks, SQL injection risks
- Runs final `npx tsc --noEmit` and reports issues

---

## Coordination Rules
1. Each agent only touches files in its assigned scope — no stepping on each other
2. Every commit message prefixed with role: `feat(ui):`, `feat(api):`, `feat(fs):`, `fix(qa):`
3. Agents write a brief summary of what they did to `docs/AGENT_LOG.md` after committing
4. QA agent runs last and signs off before main agent flags for deployment
5. If a file conflict is unavoidable, main agent mediates

---

## File Ownership Map
| Path | Owner |
|---|---|
| `src/components/ui/` | Frontend |
| `src/app/broker/` | Frontend |
| `src/app/client/` | Full-Stack |
| `src/app/coborrower/` | Full-Stack |
| `src/app/api/` | Backend |
| `src/app/api/cron/` | Backend |
| `src/lib/` | Backend |
| `docs/` | Tech Lead |
