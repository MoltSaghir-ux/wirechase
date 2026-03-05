# WireChase Roadmap
*Last updated: 2026-03-05*

---

## 🎯 Vision
A two-layer platform for mortgage brokers:
- **Layer 1 (Portal)** — Premium mortgage CRM. Loan officers submit loans, borrowers upload docs, processors track the pipeline. Must be excellent as a standalone product *before* any AI is added.
- **Layer 2 (AI Processor)** — Autonomous agents that work a loan file end-to-end: verify docs, submit to lender portals, scrape conditions, clear them with clients via call/text/email, assist with e-signing. Goal: replace or drastically reduce the need for human processors.

**Target lender portals:** Rocket Pro TPO, UWM (United Wholesale Mortgage)
**Voice/comms stack (planned):** Vapi.ai (voice AI), Twilio (SMS), Resend (email — already live)
**Monetization:** Monthly subscription SaaS (~$49–$100/mo per broker or team)

---

## ✅ Phase 1A — Core Portal — COMPLETE

| Feature | Status |
|---|---|
| Broker auth (login / signup / onboarding) | ✅ |
| Team management (invite LOs, admin/LO roles) | ✅ |
| Loan intake form (4-step: borrower → loan → property → special circumstances) | ✅ |
| Dynamic document checklist generation | ✅ |
| Client upload portal (token-based, no account needed) | ✅ |
| Co-borrower upload portal (separate token/link) | ✅ |
| Email invite to borrower on submission (Resend) | ✅ |
| Broker dashboard (client list, status filter) | ✅ |
| Client detail page (docs, progress, status) | ✅ |
| Loan stage tracker (Application → Funded, clickable) | ✅ |
| Loan summary card on client detail | ✅ |
| File number / reference number | ✅ |
| Phone number collected + displayed | ✅ |
| Activity log per client | ✅ |
| Client notes | ✅ |
| Doc approve / reject + in-browser viewer | ✅ |
| Add document requests manually | ✅ |
| Archived loans view | ✅ |

---

## ✅ Phase 1B — Processor Tools — COMPLETE

| Feature | Status |
|---|---|
| Search by borrower name (dashboard) | ✅ |
| Pipeline / kanban view (grouped by loan stage) | ✅ |
| List ↔ Pipeline view toggle | ✅ |
| Stale doc timer ("Requested 14 days ago — follow up!") | ✅ |
| Document expiration tracking (pay stubs 30d, bank stmts 60d, etc.) | ✅ |
| UW Conditions UI (add, track, clear — full workflow) | ✅ |
| Address autocomplete on loan intake (Nominatim/OSM) | ✅ |

---

## ✅ Phase 1C — Portal Completion — IN PROGRESS

### Done today (2026-03-05)
| Feature | Status |
|---|---|
| Edit loan details after submission (type, amount, purpose, employment, property, co-borrower) | ✅ |
| Client detail page reorganized into tabs (Overview / Documents / Conditions / Notes & Activity) | ✅ |
| Closing date field on loan | ✅ |
| Rate lock expiry field (turns red ⚠️ within 7 days) | ✅ |
| Title company field | ✅ |
| Dashboard: open conditions count stat card | ✅ |
| Dashboard: loan stage pill on every client row | ✅ |
| Dashboard: open conditions badge on list rows + pipeline cards | ✅ |
| Dashboard: premium empty state | ✅ |

### Still To Build
| Feature | Priority | Notes |
|---|---|---|
| **Notification system** | 🔴 High | Email/in-app alerts: doc uploaded, doc expiring soon, condition 14+ days stale, rate lock expiring |
| **Bulk doc approve** | 🟡 Medium | Select all uploaded → approve in one click |
| **LOE request button** | 🟡 Medium | One click to request a Letter of Explanation from borrower |
| **Stacking order / submission packet** | 🟡 Medium | Arrange docs in correct UW order, export as single PDF |
| **Loan schema audit vs Rocket/UWM** | 🔴 High | Ensure we capture every field both portals need (NMLS, APN, title info, etc.) |
| **Document metadata** | 🔴 High | Store doc type, date range, which borrower it belongs to — critical for AI verification |
| **E-sign tracking fields** | 🟡 Medium | Docs sent for signing, signed date, which docs are outstanding |
| **Mobile responsiveness** | 🟡 Medium | At minimum client upload page + pipeline view |
| **Stripe billing** | 🔴 High (before launch) | $49–$100/mo per broker |
| **Error monitoring** | 🟡 Medium | Sentry or similar before any real users |
| **Google Maps address autocomplete** | 🟢 Low | Replace Nominatim — needs API key from Mohamed |

---

## ⏳ Phase 2 — AI Processor — FUTURE
*Do not start until Phase 1C is solid.*

### 2A — Document Intelligence
| Feature | Notes |
|---|---|
| Doc verification AI | Confirm docs match request (right type, date range, borrower name) |
| Missing info detection | Flag incomplete docs (e.g. bank statement missing pages) |
| Data extraction | Pull income from pay stub, balance from bank statement, etc. |

### 2B — Lender Portal Integration
| Feature | Notes |
|---|---|
| Rocket Pro TPO submission | Playwright automation: log in, fill loan, upload doc package |
| UWM submission | Same for UWM portal |
| Conditions scraper | After UW decision, AI reads conditions from portal → imports to WireChase |
| Cleared condition submission | AI submits cleared items back to lender portal |

### 2C — Client & Underwriter Communication
| Feature | Notes |
|---|---|
| Outbound client calls (voice AI) | Vapi.ai — call client for missing docs/conditions, sounds human |
| Inbound client calls | Client calls in, AI answers loan status questions |
| SMS to clients | Twilio — reminders for missing docs, condition requests |
| Underwriter calls | AI calls UW contact for context on conditions |
| Email drafting | AI drafts/sends professional emails to clients + UW |

### 2D — E-Sign Assistance
| Feature | Notes |
|---|---|
| E-sign doc tracking | Track which docs are out for signature and status |
| Walk-through calls | AI calls client when signing package sent, walks them through each doc |
| Follow-up automation | Call/text/email until signed |

---

## 🏗️ Technical Debt (Ongoing)
| Item | Notes |
|---|---|
| Row-level security audit | Ensure no data leaks between brokerages |
| Rate lock / deadline cron jobs | Scaffolded at `/api/cron/deadline-reminders` — needs wiring |
| Swap Nominatim → Google Maps Places | Needs API key |

---

## 📐 Current Sprint
**Phase:** 1C — Portal Completion
**Next up:** Notification system → Document metadata → Loan schema audit vs Rocket/UWM → Stripe billing
