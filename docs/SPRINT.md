# Current Sprint — Phase 1D High Priority
*Started: 2026-03-05*

## Active Tasks

### [FRONTEND] Pre-Approval Letter UI
- File: `src/components/ui/PreApprovalButton.tsx` (new)
- Add button to client detail Overview tab
- Triggers modal to set terms → downloads letter

### [BACKEND] Pre-Approval Letter API
- File: `src/app/api/loans/pre-approval/route.ts` (new)
- Generates HTML letter from loan data, returns as downloadable PDF-style HTML

### [FULLSTACK] Borrower Status Page
- File: `src/app/client/status/[token]/page.tsx` (new)
- Borrower visits link, sees loan stage + doc status
- No auth needed — token-based like upload portal

### [BACKEND] Milestone Email Automations
- File: `src/app/api/loans/update-stage/route.ts` (update)
- On every stage change, send email to borrower (and broker)
- 7 stage templates

## Done This Sprint
- (agents append here when complete)
