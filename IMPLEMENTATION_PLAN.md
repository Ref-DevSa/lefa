# Lefa: Implementation Plan

Source of truth for features: [docs/PRD.md](docs/PRD.md). Designs: [docs/designs/](docs/designs/).

## Ways of working

- **Issues → branches → PRs → merge.** One issue per slice below. Branch names: `feat/<issue#>-short-name`, `chore/…`, `docs/…`, `test/…`.
- **Small commits** using Conventional Commits, referencing the issue: `feat(vault): add policy card (#12)`.
- **TDD:** write the failing test first (API route, RLS rule or component), then make it pass, then refactor.
- **CI gate:** every PR must pass `lint`, `typecheck`, `test` and `build` before merge.
- **Definition of done:** tests green, matches the Stitch screen (mobile + desktop), loading/empty/error states handled, works on the live link.

## Repository layout

```text
lefa/
├─ client/                 React 19 + Vite + Tailwind 4
│  └─ src/
│     ├─ app/              router, providers, layouts, route guards
│     ├─ components/       ui primitives (Button, Input, Card, StatusPill, …)
│     ├─ features/         auth, vault, documents, nominees, death-reports, claims, broker
│     ├─ lib/              supabase client, api client, formatters (ZAR, dates)
│     └─ __tests__/
├─ server/                 Express 5 API
│  └─ src/
│     ├─ app.js            express app (exported for Supertest)
│     ├─ index.js          listen()
│     ├─ middleware/       auth (verify JWT → per-request Supabase client), requireRole, errors
│     ├─ routes/           policies, documents, nominees, deathReports, claims, me, vault
│     ├─ schemas/          zod schemas
│     └─ __tests__/
├─ supabase/
│  ├─ migrations/          schema, RLS, functions, storage policies
│  ├─ tests/               SQL RLS tests (pgTAP)
│  └─ seed.sql             demo data + test logins
├─ docs/  PRD.md, designs/
├─ .github/workflows/ci.yml
├─ BUSINESS.md  README.md  IMPLEMENTATION_PLAN.md
```

## Architecture

```text
Browser (React SPA on Vercel)
   │  Supabase Auth (email+password) → access token (JWT)
   │  Storage uploads/downloads: direct to Supabase with the user's JWT (RLS on storage.objects)
   ▼
Express API on Render ── Authorization: Bearer <JWT> ──► per-request Supabase client
   │                                                     (anon key + user JWT ⇒ RLS enforced)
   ▼
Supabase Postgres: tables + RLS + SECURITY DEFINER helpers + verify_death_report() RPC
```

**The rule:** permissions live in Postgres (RLS). The API validates input (zod), checks roles for nicer errors, and shapes responses, but even a bug in the API can't leak another family's vault. The service-role key is used only by the seed script.

## Phases and issues

### Phase 0: Foundations (Mon 23 Nov, PM)
| # | Issue | Tests first |
|---|---|---|
| 1 | Implementation plan (this doc) | — |
| 2 | Monorepo scaffold: npm workspaces, client (Vite + Tailwind tokens from Stitch), server (Express 5), ESLint, `tsc --checkJs` typecheck, Jest in both | sanity test per workspace |
| 3 | CI: GitHub Actions running lint, typecheck, test and build on PR | CI green on PR |
| 4 | UI kit: Button, Input, Select, Card, StatTile, StatusPill, EmptyState, Modal, Toast, AppShell (top nav + mobile tab bar) | RTL render/interaction tests |
| 5 | Landing page (S1) + routing + 403/404 (S14) | renders CTA, routes |

### Phase 1: Backend, auth and roles (Tue 24 Nov, AM)
| # | Issue | Tests first |
|---|---|---|
| 6 | Supabase project + migration 001: `profiles`, sign-up trigger, role enum, `is_admin()`; RLS on profiles; stop role self-escalation | pgTAP: user can't update own role |
| 7 | Auth UI (S2): sign up, log in, log out, session provider, `RequireAuth` / `RequireRole` guards, role-based redirect | RTL: validation, redirect |
| 8 | API auth middleware + `GET /api/me` + error handler | Supertest: 401 without token, 200 with |

### Phase 2: Must features (Tue 24 PM → Wed 25 AM)
| # | Issue | PRD | Tests first |
|---|---|---|---|
| 9 | Migration 002: `policies` + RLS; API CRUD + `/vault/summary` | M2 | Supertest + pgTAP: other user sees 0 rows |
| 10 | My Vault (S3) + Add/Edit policy (S4) + Policy detail (S5) | M2 | RTL: totals, form validation, empty state |
| 11 | Migration 003: `documents`, storage bucket `vault` + policies; Documents page (S6) + checklist | M4 | pgTAP storage; RTL upload states |
| 12 | Migration 004: `nominees` + helper fns; API invite/accept/decline/revoke; Nominees (S7) + Nominated for me (S8) | M3 | pgTAP: **locked nominee sees 0 policies** |
| 13 | Migration 005: `death_reports`, `claims`, `claim_events`, `broker_clients`, `verify_death_report()` RPC, certificate bucket | M5 | pgTAP: verify unlocks vault + creates claims; non-broker can't verify |
| 14 | Report a death (S9) + Unlocked vault & claims (S10) | M5 | RTL: stepper, timeline |
| 15 | Broker dashboard (S11), Verify (S12), Claims pipeline (S13) | M5 | RTL + Supertest role checks (member gets 403) |

### Phase 3: Deploy and polish (Tue 24 PM, then continuous)
| # | Issue |
|---|---|
| 16 | Deploy: Supabase Cloud migrations, Render (API), Vercel (client), env vars, CORS; seed test logins |
| 17 | Responsive/accessibility pass against Stitch designs; loading skeletons; toasts |
| 18 | README complete: screenshots, architecture, local setup, tests, known issues, links |
| 19 | Loom script + final submission checklist |

### Should-haves (only once all Musts work on the live link)
S1 premium-due banner · S2 insurer directory · S3 broker links client by email · S4 claim-pack PDF.

## Testing strategy

| Layer | Tool | What |
|---|---|---|
| Database | pgTAP via `supabase test db` | Every RLS rule in PRD §5, especially nominee lock/unlock and role escalation |
| API | Jest + Supertest | Auth (401/403), validation (400), happy paths; Supabase client mocked at the boundary |
| UI | Jest + React Testing Library | Forms, guards, empty/error states, formatters (`R85 000`) |
| Manual | Live link | Demo script with the 5 test logins |

## Environments and secrets

| Var | Where |
|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL` | client (Vercel) |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `CORS_ORIGIN`, `PORT` | server (Render) |
| `SUPABASE_SERVICE_ROLE_KEY` | local seed script only, never deployed to the client |

`.env.example` files are committed; real `.env` files never are.

## Schedule

| When | Target |
|---|---|
| Mon 10:00 | Docs + Stitch designs ✅ |
| Mon 15:30 | #1 merged, issues #2–#19 created, #2–#5 in PRs |
| Tue 10:00 | #6–#8 done, CI green |
| Tue 15:30 | #16 deployed; #9–#10 live |
| Wed 10:00 | #11–#15 live, tests passing |
| Wed 15:30 | #17–#19 done → **submit** |
