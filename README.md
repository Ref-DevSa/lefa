# Lefa

> **Every policy. One vault. Claim-ready for the people you love.**
> Lefa keeps every funeral and life policy a family pays for in one secure vault, so when someone dies, the cover actually reaches the people they left behind.

South Africans hold **17 million funeral policies**, yet roughly **R88.5 billion** in financial assets sits unclaimed and **8.7 million risk policies lapsed in 2025**. Families often don't know which policies a loved one had, or how to claim them in the 7 days they have to arrange a funeral. Lefa fixes that *before* it's too late:

1. **Record** every policy across every insurer, and see your total cover.
2. **Prepare** claim documents in a private, encrypted vault.
3. **Nominate** someone you trust. They see nothing until it's needed.
4. **Unlock** when a broker verifies the death certificate.
5. **Claim and track** every payout in one timeline.

## 🔗 Links

| Resource | Link |
|---|---|
| Live app | _TODO (Tue 24 Nov)_ |
| Stitch project | [Lefa on Stitch](https://stitch.google.com/projects/15454914779053559520) |
| Loom pitch + demo | _TODO_ |
| Business case | [BUSINESS.md](BUSINESS.md) |
| PRD | [docs/PRD.md](docs/PRD.md) |
| Designs (exports) | [docs/designs/](docs/designs/README.md) |
| Implementation plan | [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) _(Mon 23 Nov)_ |

## 🔑 Test logins

_Seeded on deploy. See [PRD §9](docs/PRD.md#9-test-logins-seeded-on-deploy)._

| Role | Email | Password |
|---|---|---|
| Member (policyholder) | thandi@lefa.test | _TBC_ |
| Member (nominee, locked) | lerato@lefa.test | _TBC_ |
| Member (nominee, unlocked) | sipho@lefa.test | _TBC_ |
| Broker | broker@lefa.test | _TBC_ |
| Admin | admin@lefa.test | _TBC_ |

## 🧱 Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS 4, React Router 7, TanStack Query |
| API | Node.js 20+, Express 5, zod |
| Database | Supabase: PostgreSQL, Auth, Row Level Security, Storage |
| Tests / CI | Jest, React Testing Library, Supertest, GitHub Actions |
| Hosting | Vercel (client) · Render (API) · Supabase Cloud |

_Screenshots, architecture diagram, local setup, test instructions and known issues will be added as the build progresses._

## 👤 Author

Refilwe · [@Ref-DevSa](https://github.com/Ref-DevSa)
