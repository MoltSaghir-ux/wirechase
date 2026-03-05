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

## ✅ Phase 1D — Broker Workflow Features — COMPLETE

### High Priority — DONE
| Feature | Notes | Status |
|---|---|---|
| **Pre-approval letter generator** | POST `/api/loans/pre-approval` — styled HTML letter, downloadable | ✅ Done |
| **Borrower-facing status page** | `/client/status/[token]` — loan pipeline, doc checklist, no login needed | ✅ Done |
| **Milestone email automations** | Auto-fires Resend email on stage change (processing → funded) | ✅ Done |

### Medium Priority — DONE
| Feature | Notes | Status |
|---|---|---|
| **Referral partner tracking** | `referral_partners` table, panel on Overview tab, `/broker/referrals` management page | ✅ Done |
| **Task assignment** | `loan_tasks` table, `LoanTasks` component on Notes tab, `/broker/tasks` team overview | ✅ Done |
| **Reporting & analytics** | `/broker/reports` — monthly volume chart, stage/type breakdown, avg close time | ✅ Done |
| **Bulk doc approve** | "Approve All" button in docs tab action bar | ✅ Done |
| **LOE request button** | Inline form + Resend email to borrower + doc request created | ✅ Done |
| **Stacking order / submission packet** | Numbered UW-order panel with clipboard copy | ✅ Done |
| **Two-way SMS** | Twilio — needs credentials | ⏳ Deferred |
| **Pre-approval letter templates** | Multiple formats, custom branding | ⏳ Deferred |

### Security & Polish — DONE
| Feature | Notes | Status |
|---|---|---|
| **API ownership checks** | All export/conditions/doc-metadata routes hardened | ✅ Done |
| **Cron secret hardening** | Bearer header + empty-secret guard on all cron routes | ✅ Done |
| **Input validation** | UUID + email validation on onboarding routes | ✅ Done |
| **UI/UX premium polish** | Gradient stat cards, colored badges, tab bar, pulse bell, celebration state | ✅ Done |

---

## 🔨 Phase 1E — Launch Readiness — NEXT

### 🔴 Must-Have Before Launch
| Feature | Notes | Status |
|---|---|---|
| **Stripe billing** | $49–$100/mo per broker/team. Gate features behind subscription. | ❌ Todo |
| **Vercel cron config** | Add `vercel.json` with cron schedules for deadline-reminders + digest routes | ❌ Todo |
| **Error monitoring (Sentry)** | Install before any real users touch the app | ❌ Todo |
| **Mobile responsiveness** | At minimum: client upload portal, pipeline view, client detail | ❌ Todo |
| **Onboarding flow polish** | Smooth first-run experience for new brokers signing up | ❌ Todo |

### 🟡 Nice to Have Before Launch
| Feature | Notes | Status |
|---|---|---|
| **Rate quote / GFE worksheet** | Basic rate quote builder, Good Faith Estimate worksheet | ❌ Todo |
| **Google Maps address autocomplete** | Replace Nominatim — needs API key from Mohamed | ❌ Todo |
| **Pre-approval letter templates** | Multiple formats (full, conditional, pre-qual), custom branding | ❌ Todo |
| **Two-way SMS** | Twilio — doc reminders, condition updates | ❌ Todo |

### 🟢 Post-Launch
| Feature | Notes | Status |
|---|---|---|
| **Credit pull integration** | Experian/Equifax/TransUnion soft pull APIs | ❌ Todo |
| **Built-in e-sign** | DocuSign/HelloSign integration or native | ❌ Todo |
| **Mobile app / PWA** | Full PWA or React Native | ❌ Todo |

---

## ⏳ Phase 2 — AI Processor — FUTURE
*Do not start until Phase 1E is solid and billing is live.*

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
| Item | Notes | Status |
|---|---|---|
| Vercel cron config | `vercel.json` needs cron schedule entries | ❌ Todo |
| Error monitoring | Sentry before any real users | ❌ Todo |
| Mobile responsiveness | Portal currently desktop-only | ❌ Todo |
| RLS audit | Row-level security — verify no cross-brokerage data leaks | ✅ Partially done (ownership checks added) |

---

## 📐 Current Sprint — Phase 1E Launch Readiness
**Up next:** Stripe billing → Vercel cron config → Sentry → Mobile responsiveness → Onboarding polish
