# WireChase Roadmap
*Last updated: 2026-03-05*

---

## 🎯 Vision
A premium mortgage CRM (think Salesforce/Arrive for mortgage brokers) with built-in AI processing.
Monthly subscription SaaS. Goal: replace or drastically reduce the need for human processors.

**Target lender portals:** Rocket Pro TPO, UWM (United Wholesale Mortgage)
**Voice/comms stack (planned):** Vapi.ai (voice AI), Twilio (SMS), Resend (email — live)
**Monetization:** Monthly subscription (~$49–$100/mo per broker or team)

---

## ✅ Phase 1A — Core Portal — COMPLETE
Auth, onboarding, loan intake form, dynamic doc checklist, client upload portal, co-borrower portal,
email invites, dashboard, client detail page, stage tracker, file numbers, activity log, notes,
doc approve/reject/viewer, archive, team management.

---

## ✅ Phase 1B — Processor Tools — COMPLETE
Search, pipeline/kanban view, stale doc timer, doc expiration tracking, UW Conditions UI,
address autocomplete.

---

## ✅ Phase 1C — Portal Completion — COMPLETE
Edit loan details, client detail tabs (Overview/Docs/Conditions/Notes), closing date, rate lock expiry
(red warning ≤7 days), title company, dashboard condition counts + stage pills, notification bell,
daily cron emails (rate lock, stale conditions, deadlines), document metadata (type/date range/borrower),
MISMO 3.4 XML export, Fannie Mae 3.2 export, property county/state/zip, borrower DOB/SSN last4.

---

## 🔨 Phase 1D — Broker Workflow Features — IN PROGRESS

### 🔴 High Priority (building now)
| Feature | Notes | Status |
|---|---|---|
| **Pre-approval letter generator** | One-click generate a pre-approval PDF/letter from loan data. Broker downloads and sends to client/realtor. | 🔨 Building |
| **Borrower-facing status page** | Borrower logs in via their token and sees loan stage, which docs are pending/approved, what's still needed. Major trust-builder. | 🔨 Building |
| **Milestone email automations** | Auto-email borrower (and optionally broker) when loan stage changes. "Your loan has moved to Conditional Approval" etc. | 🔨 Building |

### 🟡 Medium Priority
| Feature | Notes | Status |
|---|---|---|
| **Referral partner tracking** | Track which realtor/agent referred each loan. Partner gets milestone update emails. Critical for broker relationships. | ❌ Todo |
| **Task assignment** | Assign specific tasks/todos to team members. "Follow up on bank statements — assigned to John." | ❌ Todo |
| **Reporting & analytics** | Dashboard with: loan volume by month, avg time to close, close rate, docs per loan, team performance. | ❌ Todo |
| **Two-way SMS** | Twilio SMS to/from borrowers for doc reminders, condition updates. | ❌ Todo |
| **Pre-approval letter templates** | Multiple letter formats (full approval, conditional, pre-qual). Custom branding. | ❌ Todo |
| **Bulk doc approve** | Select all uploaded docs → approve in one click. | ❌ Todo |
| **LOE request button** | One click to request Letter of Explanation from borrower for a specific item. | ❌ Todo |
| **Stacking order / submission packet** | Arrange docs in correct UW order, export as single PDF. | ❌ Todo |

### 🟢 Nice to Have
| Feature | Notes | Status |
|---|---|---|
| **Rate quote / GFE worksheet** | Basic rate quote builder, Good Faith Estimate worksheet. | ❌ Todo |
| **Credit pull integration** | Connect to Experian/Equifax/TransUnion soft pull APIs. | ❌ Todo |
| **Built-in e-sign** | Actual document signing (DocuSign/HelloSign integration or native). | ❌ Todo |
| **Mobile app / PWA** | At minimum a PWA so brokers can check pipeline on phone. | ❌ Todo |
| **Google Maps address autocomplete** | Replace Nominatim — needs API key. | ❌ Todo |
| **Stripe billing** | $49–$100/mo per broker. Implement before launch. | ❌ Todo |

---

## ⏳ Phase 2 — AI Processor — FUTURE
*Do not start until Phase 1D is solid.*

### 2A — Document Intelligence
| Feature | Notes |
|---|---|
| Doc verification AI | Confirm docs match request (right type, date range, borrower name) |
| Missing info detection | Flag incomplete docs (e.g. bank statement missing pages) |
| Data extraction | Pull income from pay stub, balance from bank statement |

### 2B — Lender Portal Integration
| Feature | Notes |
|---|---|
| Rocket Pro TPO submission | Playwright automation: log in, fill loan data, upload doc package |
| UWM submission | Same for UWM portal |
| Conditions scraper | After UW decision, AI reads conditions → imports to WireChase |
| Cleared condition submission | AI submits cleared items back to lender portal |

### 2C — Client & Underwriter Communication
| Feature | Notes |
|---|---|
| Outbound client calls (voice AI) | Vapi.ai — call client for missing docs/conditions, sounds human |
| Inbound client calls | Client calls in, AI answers questions about loan status |
| SMS to clients | Twilio — doc reminders, condition requests |
| Underwriter calls | AI calls UW for context on conditions |
| Email drafting | AI drafts/sends professional emails to clients + UW |

### 2D — E-Sign Assistance
| Feature | Notes |
|---|---|
| E-sign doc tracking | Track which docs are out for signature |
| Walk-through calls | AI calls client when signing package sent, walks through each doc |
| Follow-up automation | Call/text/email until signed |

---

## 🏗️ Technical Debt (Ongoing)
| Item | Notes |
|---|---|
| Row-level security audit | Ensure no data leaks between brokerages |
| Rate lock / deadline cron wiring | Scaffolded — needs Vercel cron config in vercel.json |
| Error monitoring | Sentry before any real users |
| Mobile responsiveness | Portal currently desktop-only |

---

## 📐 Current Sprint — Phase 1D High Priority
**Active:** Pre-approval letter generator + Borrower status page + Milestone email automations
**Next:** Referral partner tracking → Task assignment → Reporting & analytics
