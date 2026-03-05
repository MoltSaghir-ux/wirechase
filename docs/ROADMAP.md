# WireChase Roadmap
*Last updated: 2026-03-05*

---

## 🎯 Vision
A two-layer platform for mortgage brokers:
- **Layer 1 (Portal)** — Loan officers submit loans, borrowers upload docs, processors track the pipeline. Must be excellent as a standalone product *before* any AI is added.
- **Layer 2 (AI Processor)** — Autonomous agents that work a loan file end-to-end: verify docs, submit to lender portals, scrape conditions, clear them with clients via call/text/email, assist with e-signing.

**Target lender portals:** Rocket Pro TPO, UWM (United Wholesale Mortgage)
**Voice/comms stack (planned):** Vapi.ai (voice AI), Twilio (SMS), Resend (email — already live)

---

## ✅ Phase 1A — Core Portal (COMPLETE)

| Feature | Status |
|---|---|
| Broker auth (login / signup) | ✅ Done |
| Onboarding flow (create brokerage) | ✅ Done |
| Team management (invite LOs, admin/LO roles) | ✅ Done |
| Loan intake form (4-step: borrower → loan → property → special circumstances) | ✅ Done |
| Dynamic document checklist generation (based on loan profile) | ✅ Done |
| Client upload portal (no account needed, token-based) | ✅ Done |
| Co-borrower upload portal (separate token/link) | ✅ Done |
| Email invite to borrower on loan submission (Resend) | ✅ Done |
| Broker dashboard (client list, status filter) | ✅ Done |
| Client detail page (docs, progress, status) | ✅ Done |
| Loan stage tracker (Application → Funded, clickable) | ✅ Done |
| Loan summary card on client detail | ✅ Done |
| File number / reference number (WC-YYYY-XXXX) | ✅ Done |
| Phone number collected + displayed on client detail | ✅ Done |
| Activity log per client | ✅ Done |
| Client notes | ✅ Done |
| Doc approve / reject (DocReview) | ✅ Done |
| Doc viewer (in-browser) | ✅ Done |
| Add document requests manually | ✅ Done |
| Archived loans view | ✅ Done |

---

## ✅ Phase 1B — Processor Tools (COMPLETE as of 2026-03-05)

| Feature | Status |
|---|---|
| Search by borrower name (dashboard) | ✅ Done |
| Pipeline / kanban view (grouped by loan stage) | ✅ Done |
| List ↔ Pipeline view toggle | ✅ Done |
| Stale doc timer ("Requested 14 days ago — follow up!") | ✅ Done |
| Document expiration tracking (pay stubs 30d, bank stmts 60d, etc.) | ✅ Done |
| UW Conditions UI (add, track, clear — full workflow) | ✅ Done |
| Address autocomplete on loan intake (Nominatim/OSM — swap to Google Maps later) | ✅ Done |

---

## 🔨 Phase 1C — Portal Completion (TODO)

These are the remaining features needed before the portal is truly production-ready.

### High Priority
| Feature | Notes |
|---|---|
| **Edit loan details** | Can edit client info but not the loan itself (type, amount, purpose, property). Processors need to fix mistakes. |
| **Document metadata** | Store doc type, date range it covers, which borrower it belongs to. Critical for AI verification later. |
| **Loan schema audit vs Rocket/UWM** | Ensure we're capturing every field both portals need for submission (NMLS, APN, title company, etc.) |
| **Deadline / rate lock expiry fields** | Rate lock expiry date on the loan. Processor needs to know when they're up against the clock. |
| **E-sign tracking** | Fields for: docs sent for signing, signed date, which docs are out for signature. |
| **Closing date field** | Add to loan record. Referenced everywhere in the final stages. |
| **Notification system** | Email/in-app alerts when: client uploads doc, doc expires soon, condition goes 14+ days without movement. |

### Medium Priority
| Feature | Notes |
|---|---|
| **Bulk doc approve** | Select all uploaded docs → approve in one click. Saves time when a client uploads everything at once. |
| **LOE request button** | One click to request a Letter of Explanation from the borrower for a specific item. |
| **Stacking order / submission packet** | Arrange docs in the correct UW order and export as a single PDF for manual submission. |
| **Condition count on dashboard** | Show "3 open conditions" badge on each client card in the dashboard list. |
| **Notes visible from dashboard** | Surface latest note on the client card so processors don't have to click in to see it. |
| **Template management** | Save and reuse document checklists for common loan types. |
| **Stripe billing** | $49/mo per broker (or team pricing). Needed before any real launch. |

---

## 🤖 Phase 2 — AI Processor (FUTURE)

*Do not start until Phase 1C is solid. The AI needs a clean data foundation.*

### 2A — Document Intelligence
| Feature | Notes |
|---|---|
| Doc verification AI | Read uploaded docs, confirm they match what was requested (right type, right date range, right borrower name) |
| Missing info detection | Flag docs that are present but incomplete (e.g. bank statement missing pages) |
| Data extraction | Pull key data points from docs (income figure from pay stub, account balance from bank statement) |

### 2B — Lender Portal Integration
| Feature | Notes |
|---|---|
| Rocket Pro TPO submission | Playwright automation: log in, fill loan data, upload doc package |
| UWM submission | Same — UWM portal automation |
| Conditions scraper | After UW decision, AI logs into portal, reads conditions, imports them into WireChase automatically |
| Cleared condition submission | AI uploads cleared condition items back to lender portal |

### 2C — Client & Underwriter Communication
| Feature | Notes |
|---|---|
| Outbound client calls (voice AI) | Vapi.ai — call client to request missing docs or conditions. Sounds human. |
| Inbound client calls | Client can call in and AI answers questions about their loan status |
| SMS to clients | Twilio — text reminders for missing docs, condition requests |
| Underwriter calls | AI calls UW contact to get context on conditions, ask clarifying questions |
| Email drafting | AI drafts and sends professional emails to clients and UW |

### 2D — E-Sign Assistance
| Feature | Notes |
|---|---|
| E-sign doc tracking | Know which docs are out for signature and their status |
| Walk-through calls | AI calls client when signing package is sent, walks them through each document |
| Follow-up on unsigned docs | Automated reminders via call/text/email until signed |

---

## 🏗️ Technical Debt / Infrastructure (Ongoing)
| Item | Notes |
|---|---|
| Swap Nominatim → Google Maps Places API | Address autocomplete accuracy. Need API key from Mohamed. |
| Row-level security audit on Supabase | Ensure no data leaks between brokerages |
| Rate lock / deadline cron jobs | Already scaffolded (`/api/cron/deadline-reminders`) — needs wiring |
| Mobile responsiveness | Portal currently desktop-only. At minimum the client upload page should be mobile-friendly. |
| Error monitoring | Add Sentry or similar before any real users |

---

## 📐 Current Sprint (2026-03-05)
Working on: **Phase 1C — Portal Completion**
Next up: Edit loan details → Document metadata → Loan schema audit
