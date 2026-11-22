# Lefa: Product Requirements Document (PRD)

| | |
|---|---|
| **Product** | Lefa: family insurance policy vault |
| **Owner** | Refilwe ([@Ref-DevSa](https://github.com/Ref-DevSa)) |
| **Status** | v1.0 (MVP), approved for build |
| **Date** | 22 November 2026 |
| **Business case** | [BUSINESS.md](../BUSINESS.md) |

---

## 1. Overview

Lefa lets a South African policyholder record every funeral/life policy they hold, store the documents a claim will need, and nominate a trusted person. When the policyholder dies, the nominee reports the death; a broker or admin verifies it; the nominee then gets access to the vault and a claim tracker for every policy.

### Goals (MVP)
- A member can build a complete vault (policies + documents + nominee) in **under 10 minutes**.
- A nominee **cannot read any vault data** until a death report is verified. This is enforced in the database, not just hidden in the UI.
- A broker can verify a death and move claims through statuses from one dashboard.

### Non-goals (MVP)
- Direct integration with insurers' systems (claims are tracked, not submitted, by Lefa).
- Payments / subscriptions billing (pricing is shown; billing is post-MVP).
- Native mobile apps (responsive web only).
- Automatic OCR of policy documents.

---

## 2. Users and roles

The database stores one `role` per account. *Nominee* is a **relationship**, not a role: any member can be a policyholder and also a nominee for someone else.

| Role | Who | Can do |
|---|---|---|
| **member** | Policyholders and nominees (the public) | Manage *own* vault; invite nominees; accept nominations; report a death for someone who nominated them; view a vault + update claims **only after verification** |
| **broker** | Licensed brokers / funeral parlour staff (paying customer) | See clients linked to them; verify/reject death reports for those clients; update claim statuses for those clients |
| **admin** | Lefa operations | Everything a broker can, for all members; link clients to brokers; change roles |

Role escalation (member → broker/admin) can only be done by an admin, never from the client.

---

## 3. User stories and acceptance criteria

### Must have (MVP)

**M1: Accounts and roles**
- As a visitor, I can sign up with name, email, phone and password, and log in/out.
  - New accounts are always `member`.
  - After log-in, members land on **My Vault**, brokers/admins on **Broker Dashboard**.
  - Protected routes redirect logged-out users to log-in; wrong-role users see a 403 screen.

**M2: Policy vault**
- As a member, I can add, edit and delete a policy: insurer, policy number, type (funeral / life / credit life / other), cover amount (R), monthly premium (R), debit day (1–31), status (active / lapsed / paid-up), beneficiaries (free text), notes.
  - Validation: insurer and policy number required; amounts ≥ 0; debit day 1–31.
  - My Vault shows: total active cover, total monthly premiums, policy count, and a card per policy with a document-readiness badge (e.g. "2 of 4 docs").
  - Empty state guides the member to add their first policy.

**M3: Nominees and protected access**
- As a member, I can invite a nominee by email (+ relationship, e.g. "daughter").
- As an invited person, after signing up/logging in with that email, I see the invitation and can accept or decline.
- As a nominee *before verification*, I see only: the policyholder's name and "You are their nominee". **No policies, documents or amounts.**
- As a member, I can revoke a nominee at any time (unless a death has been verified).
  - Enforced by RLS: a nominee's `select` on `policies`/`documents` returns zero rows unless a `verified` death report exists for that owner.

**M4: Claim-ready documents**
- As a member, I can upload documents (PDF/JPG/PNG, ≤ 5 MB) and tag each with a type: *Certified ID copy, Marriage certificate, Birth certificate (child), Bank confirmation letter, Policy schedule, Other*, optionally linked to a policy.
- Each policy shows a checklist of standard claim documents (owner-side: ID, bank letter, policy schedule; claim-time: death certificate, BI-1663 notice of death, claimant ID) with ticks for what's uploaded.
- Files live in a **private** storage bucket under `{owner_id}/…`; downloads use **signed URLs valid for 60 seconds**.
- Members can delete their own documents.

**M5: Death report → verification → claim tracker**
- As a nominee, I can report a death: date of death, death certificate upload (required), DHA reference / BI-1663 number (optional), notes. Status = `pending`.
- As a broker (for linked clients) or admin, I see pending reports, can open the certificate, and **verify** or **reject** (with a reason).
- On verify:
  - the owner's vault becomes readable by **accepted** nominees,
  - a **claim** is created for every `active` policy, status `not_started`,
  - the owner's vault becomes read-only to everyone except claim updates.
- As a nominee or broker, I can move a claim through: `not_started → submitted → documents_requested → approved → paid` (or `rejected`), with an optional note. Every change is written to `claim_events` (who, when, from → to, note) and shown as a timeline.
- The nominee sees a claim summary: *"3 claims · R85 000 total · 1 paid"*.

### Should have (post-MVP if time allows)
- **S1:** Premium-due reminders (banner on vault for debits in the next 3 days; email later).
- **S2:** Insurer directory with claims phone numbers and email (seeded table).
- **S3:** Broker can invite/link a client by email.
- **S4:** Download a "claim pack" (PDF summary of policy + docs list).

### Could have
- WhatsApp notifications, multi-language UI (isiZulu, Sesotho, Setswana), insurer partner API.

---

## 4. Screens

| # | Screen | Role | Notes |
|---|---|---|---|
| S1 | Landing page | public | Pitch, how it works (Record → Prepare → Nominate → Unlock → Claim), pricing, CTA |
| S2 | Sign up / Log in | public | Inline validation, error states |
| S3 | My Vault (dashboard) | member | Totals strip, policy cards, readiness badges, nominee panel, empty state |
| S4 | Add / Edit policy | member | Form (modal on desktop, full page on mobile) |
| S5 | Policy detail | member | Details, document checklist, linked documents |
| S6 | Documents | member | Upload (drag/drop + picker), list, type filter, delete |
| S7 | Nominees | member | Invite form, list (invited / accepted / declined), revoke |
| S8 | Nominated for me | member | Invitations to accept; people I'm nominee for; "Report a death" CTA (locked state) |
| S9 | Report a death | member (nominee) | Form + certificate upload + confirmation |
| S10 | Unlocked vault & claims | member (nominee) | Read-only policies, documents, claim cards with status stepper + timeline |
| S11 | Broker dashboard | broker/admin | KPIs (clients, pending verifications, open claims, paid), pending-reports queue |
| S12 | Verify death report | broker/admin | Certificate viewer, owner details, verify/reject with reason |
| S13 | Claims pipeline | broker/admin | Table/kanban by status, update status with note |
| S14 | 403 / 404 / error | all | Friendly states |

All screens: mobile (390px) and desktop (1280px), with loading, empty and error states.

---

## 5. Data model (Supabase Postgres)

```text
profiles        id (uuid, = auth.users.id) PK, full_name, phone, email, role ('member'|'broker'|'admin') default 'member', created_at

policies        id PK, owner_id → profiles, insurer, policy_number, type ('funeral'|'life'|'credit_life'|'other'),
                cover_amount numeric, monthly_premium numeric, debit_day int 1–31,
                status ('active'|'lapsed'|'paid_up'), beneficiaries text, notes text, created_at, updated_at

documents       id PK, owner_id → profiles, policy_id → policies NULL, doc_type (enum), file_name,
                storage_path, mime_type, size_bytes, created_at

nominees        id PK, owner_id → profiles, nominee_email citext, nominee_id → profiles NULL,
                relationship, status ('invited'|'accepted'|'declined'|'revoked'), created_at
                UNIQUE(owner_id, nominee_email)

broker_clients  broker_id → profiles, client_id → profiles, PK(broker_id, client_id)

death_reports   id PK, owner_id → profiles (deceased), reported_by → profiles, date_of_death,
                certificate_path, dha_reference, notes,
                status ('pending'|'verified'|'rejected'), reviewed_by → profiles NULL,
                reviewed_at, rejection_reason, created_at
                (one non-rejected report per owner)

claims          id PK, policy_id → policies UNIQUE, death_report_id → death_reports,
                status ('not_started'|'submitted'|'documents_requested'|'approved'|'paid'|'rejected'),
                updated_at

claim_events    id PK, claim_id → claims, actor_id → profiles, from_status, to_status, note, created_at
```

### Helper SQL functions (SECURITY DEFINER, stable)
- `is_admin()`: current user is admin.
- `is_broker_of(client uuid)`: current user is a broker linked to `client`.
- `is_unlocked_nominee(owner uuid)`: current user is an **accepted** nominee of `owner` **and** a `verified` death report exists for `owner`.
- `is_nominee_of(owner uuid)`: accepted nominee (no unlock).

### Row Level Security rules

| Table | select | insert | update | delete |
|---|---|---|---|---|
| profiles | self; broker of; admin; unlocked nominee (owner's name already visible via nominee row) | trigger on sign-up only | self (not `role`); admin (any) | none |
| policies | owner; unlocked nominee; broker of owner; admin | owner, if not deceased | owner, if not deceased | owner, if not deceased |
| documents | owner; unlocked nominee; broker of; admin | owner | none | owner |
| nominees | owner; the nominee (matched by id or email) | owner | owner (revoke); nominee (accept/decline own row only) | owner |
| death_reports | reporter; owner's accepted nominees; broker of owner; admin | accepted nominee of owner (`status='pending'` only) | broker of owner / admin (status → verified/rejected) | none |
| claims | unlocked nominee; broker of owner; admin | via `verify_death_report()` RPC only | unlocked nominee; broker of; admin | none |
| claim_events | same as claims | trigger on claims status change | none | none |

**Storage:** bucket `vault` (private). Path `{owner_id}/{uuid}-{filename}`. Policies: owner can insert/read/delete within own folder; unlocked nominee/broker/admin can read. Bucket `death-certificates` (private): reporter can insert under `{owner_id}/`; reporter, broker of, admin can read.

**Verification** is a single Postgres function `verify_death_report(report_id)`. It checks the caller is broker-of/admin, sets status, and creates claims in one transaction.

---

## 6. API (Express 5, thin layer over Supabase with the user's JWT)

The Express server forwards the caller's Supabase access token, so **RLS applies to every request**. The service-role key is never used for user-initiated reads.

| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | /api/health | public | Health check |
| GET | /api/me | any | Profile + role |
| GET/POST | /api/policies | member | List / create own |
| PATCH/DELETE | /api/policies/:id | member | Update / delete own |
| GET | /api/vault/summary | member | Totals + readiness |
| GET/POST | /api/documents | member | List / register uploaded doc |
| GET | /api/documents/:id/url | owner/unlocked | 60s signed URL |
| DELETE | /api/documents/:id | owner | Delete doc + file |
| GET/POST | /api/nominees | member | My nominees / invite |
| PATCH | /api/nominees/:id | owner or nominee | Revoke / accept / decline |
| GET | /api/nominations | member | Where I'm the nominee |
| POST | /api/death-reports | nominee | Report death |
| GET | /api/death-reports?status=pending | broker/admin | Queue |
| POST | /api/death-reports/:id/verify | broker/admin | Verify → creates claims |
| POST | /api/death-reports/:id/reject | broker/admin | Reject with reason |
| GET | /api/vaults/:ownerId | unlocked nominee/broker/admin | Read-only vault + claims |
| GET | /api/claims | broker/admin | Pipeline |
| PATCH | /api/claims/:id | unlocked nominee/broker/admin | Change status + note |
| GET | /api/claims/:id/events | same | Timeline |

Validation with **zod** on every body; consistent error shape `{ error: { code, message } }`.

---

## 7. Non-functional requirements

- **Security / POPIA:** private buckets only; signed URLs ≤ 60s; RLS on every table; no service-role key in the client; HTTPS; minimum personal data (no ID numbers stored as fields). Privacy notice on sign-up.
- **Performance:** vault loads < 2s on 3G-class connection; images lazy-loaded.
- **Accessibility:** WCAG 2.1 AA contrast, keyboard navigation, labelled inputs, 44px touch targets.
- **Responsive:** 360px → 1440px.
- **Tone:** warm, respectful, plain language (users may be grieving).
- **Quality:** Jest + React Testing Library (frontend), Jest + Supertest (API), SQL RLS tests; CI runs lint, typecheck (JSDoc + `tsc --checkJs` or TypeScript), tests and build on every PR.

---

## 8. Tech stack

| Layer | Tech |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS 4, React Router 7, TanStack Query, lucide-react |
| API | Node 20+, Express 5, zod |
| Database / Auth / Storage | Supabase (Postgres, Auth, RLS, Storage) |
| Tests | Jest, React Testing Library, Supertest |
| CI | GitHub Actions |
| Hosting | Vercel (client), Render (API), Supabase Cloud (DB) |

---

## 9. Test logins (seeded on deploy)

| Role | Email | Scenario |
|---|---|---|
| member | thandi@lefa.test | Policyholder with 3 policies, docs, 1 nominee |
| member | lerato@lefa.test | Nominee of Thandi (locked) |
| member | sipho@lefa.test | Nominee for a deceased member (unlocked, claims in progress) |
| broker | broker@lefa.test | Linked to all demo clients, 1 pending verification |
| admin | admin@lefa.test | Full access |

Passwords are listed in the README.

---

## 10. Risks and mitigations

| Risk | Mitigation |
|---|---|
| False death report to gain access | Certificate required + human verification by broker/admin; reporter must be an *accepted* nominee; audit trail |
| Sensitive documents leaked | Private buckets, RLS on storage, short-lived signed URLs |
| 3-day build deadline | Strict MVP scope (M1–M5); Should-haves only after all Musts pass on the live link |
