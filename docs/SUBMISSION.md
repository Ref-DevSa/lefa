# Lefa: final submission checklist (Wed 25 Nov, 15:30 SAST)

Work after 15:30 isn't counted, so aim to post by **15:00**.

## Capstone

- [x] Public repo: https://github.com/Ref-DevSa/lefa
- [x] `BUSINESS.md` and the README pitch
- [x] PRD: `docs/PRD.md`
- [x] Stitch designs in `docs/designs/`, link in the README
- [x] Implementation plan merged; issues #1–#19 on GitHub
- [x] Live link: https://lefa-nine.vercel.app (API: https://lefa-api.onrender.com/api/health)
- [x] Log-in with roles, hosted database with migrations, CI on every PR
- [x] **All Must features working on the live link** (M1–M5)
- [x] Tests passing: pgTAP 115 · API 103 · website 197
- [x] README: screenshots, architecture, setup, tests, known issues, test logins
- [ ] **Loom recorded** (script: `docs/LOOM_SCRIPT.md`) and its link added to the README
- [ ] `npm run db:reset-demo` run after recording, so reviewers can verify a death too
- [ ] Final check: open the live link in a private window and log in as each demo account

## Portfolio

- [x] Public repo: https://github.com/Ref-DevSa/portfolio
- [x] Live: https://refilwe-segoe.vercel.app
- [x] About, projects (Lefa first, group projects, individual builds) with screenshots, problem, role, stack, live and GitHub links
- [x] Skills, responsive, no broken links, README
- [ ] **Contact:** email, LinkedIn URL
- [ ] **CV download** (PDF)

## Final message (paste in the channel)

```
Name: Refilwe Segoe
Business / app name: Lefa
One-line pitch: Every policy. One vault. Claim-ready for the people you love. Lefa keeps every funeral and life policy a family pays for in one secure vault, so when someone dies the cover actually reaches the people they left behind.
Capstone repo: https://github.com/Ref-DevSa/lefa
Capstone live link: https://lefa-nine.vercel.app
Loom link: <paste your Loom link>
Portfolio live link: https://refilwe-segoe.vercel.app
Portfolio repo: https://github.com/Ref-DevSa/portfolio
```

## Wednesday 10:00 check-in (paste in the channel)

```
Name: Refilwe Segoe
Business / app name: Lefa
Done since last check-in:
- All Must features live on https://lefa-nine.vercel.app: documents (private storage, claim checklist), nominees (locked until a verified death), report a death, broker verification that unlocks the vault and opens claims, unlocked vault with claim tracker, broker dashboard and claims pipeline
- Tests: 115 database security (pgTAP), 103 API, 197 front-end; CI green on every PR
- README complete: screenshots, architecture, setup, tests, known issues
- Portfolio live: https://refilwe-segoe.vercel.app
Next: Loom recording, polish (mobile and accessibility pass, dark mode), portfolio contact + CV
Blockers: None
Repo link: https://github.com/Ref-DevSa/lefa
```
