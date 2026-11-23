# How Lefa works (in plain language)

This is the "explain it to anyone" guide to Lefa: what we built, why we built it that way, and how each piece helps families and the business. It grows with every feature. For the formal spec see [PRD.md](PRD.md); for the market and pricing see [BUSINESS.md](../BUSINESS.md).

---

## 1. The problem and the product, in 30 seconds

South Africans hold **17 million funeral policies**, yet about **R88 billion** in financial assets sits unclaimed, and **8.7 million** risk policies lapsed in 2025. When someone dies, the family often doesn't know which policies exist, where the documents are, or how to claim. They need money for a funeral within a week, so many borrow from a mashonisa at 30%+ interest.

**Lefa** is a secure family vault:

1. **Record** every policy once.
2. **Prepare** the claim documents ahead of time.
3. **Nominate** a trusted person, who sees *nothing* while you're alive.
4. **Unlock:** when a death is verified by a broker, the vault opens for the nominee.
5. **Claim and track** every policy until it's paid.

**Who pays:** families can use Lefa free (R0) or pay **R29/month** for Family Plus. **Brokers** pay **R15 per client per month**, because Lefa cuts lapses (which protects their commission) and saves hours of claim admin. One broker with 80 clients brings in R1 200/month, and 100 brokers make about **R1.44m a year**. Running costs per user are cents.

> **In one sentence:** "Lefa makes sure the cover families already pay for actually reaches them. We sell to brokers, who already have the families' trust, so we earn from day one."

---

## 2. The big picture: a restaurant

| Restaurant | Lefa | What it does |
|---|---|---|
| **Dining room** | The **client**: a React website in the browser | What people see and tap: forms, the vault, the claim tracker. |
| **Waiter** | The **API server**: Express on Node.js | Takes requests from the browser, checks who is asking, and passes the order to the kitchen. |
| **Kitchen with a locked pantry** | The **database**: Postgres, run by Supabase | Stores everything. The pantry has its own locks (**RLS**), so even a confused waiter can't hand out someone else's food. |
| **Building manager** | **Supabase** | Runs the database, logins (Auth) and file storage for us, so we don't have to run servers ourselves. |

**Why this shape:**
- The browser never holds a master key. Every request carries the *user's own* login token, so the database knows exactly who is asking and applies that person's rules.
- Security lives in the database, which is the last line of defence. If the website or API has a bug, the database still refuses to leak another family's vault.
- Supabase keeps costs low (a free tier while we build, cheap at scale) and gives us tested logins, so we don't invent our own password security.

---

## 3. What we've built so far

### #1 Plan and #24 Designs
- **What:** a written plan ([IMPLEMENTATION_PLAN.md](../IMPLEMENTATION_PLAN.md)), a product spec ([PRD.md](PRD.md)) and 14 screen designs made in Stitch ([designs/](designs/)).
- **Why:** building without a plan wastes time. The designs let mentors and users react to the product before we spend days coding it.

### #2 Monorepo scaffold
- **What:** one repository with two parts: `client/` (the website) and `server/` (the API).
- **Why:** one place, one install command, and both halves change together in one pull request, so they never drift apart.

### #3 Automatic checks (CI)
- **What:** every time code is pushed, GitHub runs the linter (style and bug-pattern checks), the type checker, all the tests and a production build.
- **Why:** mistakes are caught in minutes, not by a user. For a product holding death certificates, "it worked on my laptop" isn't good enough.

### #4 UI kit
- **What:** reusable buttons, inputs, cards, status pills, modals and toasts in Lefa's colours (green, ochre, cream). Money is shown as "R85 000" and dates as "22 Nov 2026".
- **Why:** consistency builds trust, especially for grieving users. Building a part once and reusing it makes every later screen faster to build.

### #5 Landing page and routing
- **What:** the public landing page, plus 403, 404 and error pages.
- **Why:** the landing page explains the value and the pricing and converts visitors into sign-ups. The error pages mean users never hit a blank, scary screen.

### #6 Database: profiles, roles and security (RLS)
- **What:**
  - A `profiles` table with one row per person (name, phone, role).
  - Three **roles**: `member` (families and nominees), `broker` (verifies deaths, manages clients) and `admin` (runs the platform).
  - A **sign-up trigger**: when someone signs up, their profile is created automatically, always as a `member`.
  - A **guard**: nobody can make themselves an admin or change their email behind the system's back. Only an admin can change roles.
  - **Row Level Security (RLS)** rules: you see only your own profile, an admin sees everyone, and anonymous visitors see nothing.
- **Why:**
  - **Roles drive the business.** Brokers are the paying customers and the people who verify deaths. If anyone could call themselves a broker, they could "verify" a fake death and unlock a stranger's vault. So roles are set only by an admin, never by the person signing up.
  - **RLS is the locked pantry.** The database itself checks every row against the rules, so no app bug can show Thandi's policies to Lerato.
- **How we know it works:** 16 automated tests run against the real database. They try to cheat: Thandi tries to read Lerato's profile, Thandi tries to make herself admin, Lerato tries to sign up as admin, and a stranger tries to read the table. Every attempt must be blocked. All the test data is undone afterwards. We also confirmed live that an anonymous request is refused (401).

> **In one sentence:** "Privacy isn't a promise in our code, it's enforced by the database, and we have automated tests that try to break in every time we change anything."

### #7 Sign up, log in and page guards
- **What:**
  - **Sign-up and log-in screens** (S2) with friendly, specific error messages.
  - **A session provider:** one place in the app that knows who is logged in and what their role is, so every screen asks it instead of working it out alone.
  - **Guards** on protected pages:
    - a logged-out visitor is sent to log-in, and returns to the page they wanted afterwards;
    - a member who opens a broker page sees a polite 403 page with a link back to *their* home.
  - **Role-based landing:** after log-in, members go to **My Vault** and brokers/admins go to the **Broker Dashboard**.
- **Why each detail:**
  - **Checks in the form** (valid email, SA phone number, password of at least 8 characters with a letter and a number, POPIA consent) catch mistakes instantly, before anything is sent. The phone is saved in one format (`+27821234567`), so later features like SMS reminders can rely on it.
  - **Friendly errors:** "Incorrect email or password" instead of technical messages. It also never says *which* part was wrong, so nobody can use the form to discover who has an account.
  - **The sign-up never sends a role.** Even the "I'm a broker" button creates a normal member account, with a note that Lefa activates brokers after a check. Brokers verify deaths, so this has to be a human decision.
  - **The guards are for convenience, not security.** They give users a smooth experience. The real lock is still RLS in the database (#6): even if someone bypasses a page, the database hands them nothing.
- **How we know it works:** automated tests click through the app like a person would. They cover empty forms, wrong passwords, duplicate emails, member vs broker landing, returning to the original page, blocked pages, a failed profile load with a "Try again" button, and logging out (which locks the vault again). The tests use a pretend Supabase, so they're fast and never touch real data.

> **In one sentence:** "Signing up takes under a minute, everyone lands on the right screen for their role, and nobody can give themselves broker powers, because roles are granted by people, not by forms."

---

## 4. Keys and secrets

| Thing | Secret? | Where it lives |
|---|---|---|
| Project URL (`https://<ref>.supabase.co`) | No | `.env` files, safe to share |
| **anon** (public) key | No, it's designed to be public | Browser and API. On its own it can only do what RLS allows, which for a stranger is nothing. |
| **service_role** key | **Yes, the master key** | Never in the browser, never in chat, never in Git. Only for admin scripts such as seeding demo data. |
| Database password | **Yes** | Only in your head or password manager |

- The real `.env` files are **gitignored**, so they are never uploaded to GitHub. Only the empty templates (`.env.example`) are committed, so a new developer knows which settings to fill in.
- **Why it matters:** a leaked master key would bypass every lock we built. Keeping it out of the app means a hacked browser or a copied website gets nothing extra.

---

## 5. How a change gets into Lefa

1. Each feature has a **GitHub issue** (#6, #7, …) matching the plan.
2. The work happens on its own **branch** and is opened as a **pull request**. CI must pass before merging.
3. Database changes are **migration files** in `supabase/migrations/`: numbered, repeatable scripts. `npm run db:push` applies them, and `npm run db:test` proves the security rules still hold.

**Why:** every change is reviewed, tested and traceable. If something breaks, we can see exactly which change did it and undo it. Insurers and partners will ask about this.

---

## 6. Before real customers (go-live checklist)

- [ ] Turn **Confirm email** back on (Supabase → Authentication) with a proper email provider (custom SMTP). It's off during the MVP so testing and demos are quick.
- [ ] Use a separate production Supabase project, keeping the demo/test data apart.
- [ ] Get a POPIA review of the privacy notice and of how long death certificates are kept.
- [ ] Run backups and a restore test.
- [ ] Add rate limiting on sign-up and log-in.
- [ ] Publish a full privacy notice page and link it from the sign-up consent checkbox.
- [ ] Add "Forgot password?" (needs email sending, so it comes with custom SMTP).

---

## 7. Mini-glossary

- **API:** the "waiter" program that the website talks to.
- **Migration:** a script that changes the database's structure, kept in Git like code.
- **RLS (Row Level Security):** database rules that decide, row by row, who can see or change what.
- **Role:** a label (member, broker, admin) that decides what someone is allowed to do.
- **Trigger:** code that runs automatically in the database when something happens, such as a new sign-up.
- **JWT / token:** the digital "wristband" a user gets at login; every request shows it so the database knows who's asking.
- **CI:** the robot that tests every change automatically on GitHub.
- **Gitignored:** a file Git deliberately never uploads (used for secrets).

- **Session:** the "you're logged in" state the browser keeps after log-in, so you don't type your password on every page.
- **Guard:** a check in front of a page that decides whether to show it, redirect to log-in, or show 403.

*Next up: #8 API login checks.*
