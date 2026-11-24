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

### #8 The API checks who's asking
- **What:**
  - **A login check on the API ("the waiter checks your wristband").** Every request to a protected address must carry the user's login token. The API asks Supabase "is this token real and still valid?" before doing anything.
  - **The API acts *as* the user.** It talks to the database using that same user's token, so the database's RLS rules (#6) apply exactly as if the user asked directly. The API never uses the master key for user requests.
  - **`GET /api/me`** answers "who am I?" with the caller's profile and role.
  - **`requireRole`:** a check that later broker-only features (verifying deaths, the claims pipeline) will use. A member who tries them gets **403**.
  - **One error format everywhere:** `{ "error": { "code": "...", "message": "..." } }`.
- **Why each detail:**
  - **Checking the token with Supabase every time,** not just reading it, means a logged-out or blocked session is refused immediately instead of working for up to an hour.
  - **Using the user's token for the database** means even an API bug can't show one family's data to another: the database still applies its rules.
  - **Different codes for different problems:**
    - **401** means "you need to log in".
    - **403** means "you're logged in, but this isn't for you".
    - **503** means "our login service is down, it's not your fault".
    - **500** means "something broke on our side", with a generic message.
    The app can then react correctly, for example sending you to log-in only when your login is actually the problem.
  - **The error handler hides internal details** (database errors, code paths) from the browser and logs them for us instead. Leaked internals help attackers.
- **How we know it works:** 15 automated server tests cover no token, a fake token, an expired token, a valid token, Supabase being down, a missing profile, member vs broker access, broken JSON and unexpected crashes, including a check that secret details never reach the response. We also tested the live API against the real Supabase: a forged token is refused (401).

> **In one sentence:** "Every request is checked at the door and then handled with the user's own permissions, so the database's privacy rules apply no matter which route the request takes."

### #9 The vault: policies in the database and API
- **What:**
  - **A `policies` table:** one row per insurance policy a member records: insurer, policy number, type (funeral / life / credit life / other), cover amount, monthly premium, debit day, status (active / lapsed / paid-up), beneficiaries and notes.
  - **Database rules on that table:**
    - insurer and policy number are required, and amounts must be R0 or more;
    - the debit day must be 1–31;
    - the same policy can't be added twice to one vault;
    - the "last edited" time is always set by the database, so it can't be faked;
    - when an account is deleted, its policies are deleted too (POPIA: no orphaned personal data).
  - **RLS:** you see, add, edit and delete only *your own* policies, and admins can read all for support. Nominee and broker access come later (#12, #13), once the tables they depend on exist.
  - **API:** list, add, edit and delete policies (`/api/policies`), plus `/api/vault/summary` with total active cover, monthly premiums, policy count and number of insurers.
- **Why each detail:**
  - **Rules in both the API and the database.** The API gives the form a clear message per field ("Debit day must be between 1 and 31."). The database is the final guard, even if someone bypasses the app.
  - **Money in exact cents.** Amounts are stored as `numeric(12,2)` and added up in whole cents, so R199.10 + R0.20 is exactly R199.30. A finance app that's out by a cent loses trust.
  - **Only *active* policies count in the totals.** Lapsed cover won't pay out, so including it would give a family false comfort. Showing the real number is the point of Lefa.
  - **You can't choose the owner.** The API rejects any `owner_id` in a request; the owner is always the logged-in person, and the database enforces this too.
  - **Someone else's policy gets "not found" (404), not "forbidden" (403).** "Forbidden" would confirm the policy exists; "not found" reveals nothing.
- **How we know it works:**
  - **On the live database: 18 new security tests** (34 in total), including:
    - another member sees 0 of Thandi's policies and can't change or delete them;
    - nobody can add a policy into someone else's vault or hand theirs to someone else;
    - bad values are refused.
  - **For the API: 21 new tests** covering logins, roles, validation messages, duplicates, 404s and the totals maths.

> **In one sentence:** "The vault shows a family the true value of their active cover in exact rands, and each family's policies are locked to them by the database itself."

### #16 Live on the internet
- **What:**

  | Piece | Host | Address |
  |---|---|---|
  | Website (the dining room) | **Vercel** | https://lefa-nine.vercel.app |
  | API (the waiter) | **Render**, Frankfurt | https://lefa-api.onrender.com |
  | Database, logins, files (the kitchen) | **Supabase**, Frankfurt | (private) |

  - **Every merge to `main` goes live automatically:** Vercel rebuilds the website and Render rebuilds the API.
  - **Five demo logins** (member, two nominees, broker, admin) are created by a re-runnable **seed script**.
- **Why each choice:**
  - **Two hosts.** The website is just files, so Vercel serves them fast and free from servers worldwide. The API is a running program, so it needs a server: Render.
  - **The API sits in Frankfurt, next to the database.** Every API request talks to the database, so keeping them in the same city keeps the app fast.
  - **The guest list (CORS).** The API only accepts browser calls from the Lefa website, so a copycat site can't use our API with a visitor's login.
  - **The master key never leaves the laptop.** The seed script uses it once, locally, and the live servers only ever have the public key. A hacked server can't bypass the privacy rules.
  - **Security headers on the website.** They stop other sites from embedding Lefa in a hidden frame (clickjacking) and limit what the browser shares.
  - **Free-plan trade-off.** Render's free API sleeps after 15 minutes. The website pings it the moment someone opens Lefa, so it's usually awake by the time they've logged in. A paid plan (about $7/month) removes this before launch.
- **How we know it works:** we tested the live API with the demo logins:
  - Thandi sees her R85 000.
  - Lerato sees zeros (not Thandi's vault).
  - A broker is refused the vault (403).
  - Fake logins are refused (401).
  - Only the Lefa website is allowed to call the API.

  We also confirmed the master key is **not** in the public website code.

> **In one sentence:** "Lefa runs on managed cloud services that cost nothing during the pilot, deploy automatically on every approved change, and keep the master key off the internet entirely."

### #10 My Vault screens: seeing and managing policies
- **What:**
  - **My Vault (S3):** a greeting and four totals:
    - total active cover ("across 2 insurers");
    - monthly premiums;
    - active policies ("2 of 3 · 1 lapsed");
    - **next debit** (date, amount and insurer).

    Below that, a card per policy (insurer, type, masked number "•••• 4821", cover, premium and debit day), **type filters**, a **lapsed-policy warning**, and a friendly first-time screen ("Add your first policy. It takes 2 minutes").
  - **Add / edit policy (S4):**
    - one-tap suggestions for common SA insurers;
    - the policy type as four big buttons;
    - amounts typed the South African way ("30 000", "199,50");
    - a clear message next to each field that needs fixing.
  - **Policy detail (S5):**
    - every field in full;
    - Edit, and Remove (with an "are you sure?" step);
    - a claim-ready checklist (ID, bank letter, policy schedule; uploads arrive in #11);
    - what the nominee will need at claim time (death certificate, BI-1663, claimant ID).
- **Why each detail:**
  - **The next debit tile** reminds people when money must be in the account. Missed debits are the main cause of the 8.7 million lapses a year.
  - **The lapse warning says it plainly:** "Lapsed cover won't pay out. Call the insurer soon." Catching a lapse early is often the difference between reinstating a policy and losing it.
  - **Masked policy numbers** in lists stop a glance over someone's shoulder from revealing them. The full number shows only on the detail page.
  - **Amounts typed the way people actually type them.** Users don't have to learn our format; the app learns theirs.
  - **A "waking up the server" note.** If the free API is asleep, the vault explains the wait instead of showing an endless spinner.
  - **No data shared between users on one device.** Saved data is labelled with the user, so if one person logs out and another logs in on the same phone, the second person never sees the first person's vault.
  - **Left out on purpose:** the design's invented claims ("AES-256", "FSP 51842", "verified via Home Affairs", "78% claims probability", "Generate PDF"). We only show what Lefa actually does.
- **How we know it works:** 60 new website tests, including:
  - totals that exclude the lapsed policy;
  - masked numbers;
  - filters and the empty vault;
  - form checks, with nothing sent when the form is invalid;
  - adding a policy (totals refresh to R100 000);
  - duplicate and server messages;
  - editing (the lapse warning appears) and removing (with confirmation, back to the vault);
  - "policy not found";
  - the date maths for "next debit", including a 31st in February.

> **In one sentence:** "My Vault turns a drawer of paper into one screen: what you're covered for, what you pay and when, and which policy needs attention before it's too late."

### #11 Claim documents, stored privately
- **What:**
  - **A Documents page:**
    - drag in (or choose) a PDF, JPG or PNG of up to 5 MB;
    - say what it is (certified ID, bank letter, policy schedule, marriage or birth certificate, other);
    - optionally link it to a policy.

    You can view, filter and delete your documents.
  - **A claim-ready checklist on every policy:**
    - ticks for what's uploaded;
    - a one-tap **Upload** button for anything missing, already filled in with the right type and policy.

    Cards show **"2 of 3 docs"**, and My Vault shows **"Claim-ready docs: 7 of 9"**.
  - **Storage:** a **private** bucket where every member has their own folder, plus a `documents` table that records each file.
- **Why each detail:**
  - **ID and bank letter count for every policy.** Insurers ask for the same ones, so you upload them once.
  - **The server checks what a file really is,** by reading its first bytes, not its name. A program renamed `invoice.pdf` is refused before it's stored.
  - **Files are private, and "View" creates a link that dies after 60 seconds.** A forwarded link stops working a minute later; ID documents and death certificates should never have a permanent web address.
  - **Two locks on every file.** Our API checks you're the owner, and the storage bucket independently refuses anyone outside their own folder. We tested going straight to storage, around our API: refused.
  - **No orphaned files.** If saving the record fails (for example, linking someone else's policy), the uploaded file is deleted again. Personal data never lingers unaccounted for (POPIA).
- **How we know it works:**
  - **On the live database: 17 new security tests** (51 in total), including:
    - another member sees 0 of Thandi's documents **and 0 of her files**;
    - nobody can store a file in someone else's folder or link to someone else's policy;
    - the type and size limits hold.
  - **Live uploads:** a real upload, a program disguised as a PDF (refused), a 60-second view link, and Lerato trying the API and then storage directly (both refused).
  - **74 new automated tests** across the API and website.

> **In one sentence:** "Families prepare their claim documents once, privately, and Lefa shows exactly what's still missing for each policy, so the claim is ready the day it's needed."

### #12 Nominees: trusted, but locked out until it matters
- **What:**
  - **Nominees page:**
    - invite up to 3 people by email, with their relationship;
    - see their status (Invited, Accepted, Declined, Revoked);
    - revoke (it asks first) or re-invite;
    - a **"Share on WhatsApp"** button sends a ready-written message saying which email to sign up with.
  - **Nominated for me:**
    - invitations you can **Accept** or **Decline**;
    - "People who trust you" cards showing **"Vault locked"**.
  - **My Vault:** a "Your nominees" panel, which nudges you to nominate someone if nobody can claim yet.
- **Why each detail:**
  - **Accepting unlocks nothing.** There is simply no rule letting a nominee read policies, documents or the owner's profile. Unlocking will require a broker-**verified death** (#13). Until then, a nominee sees exactly what a stranger sees: a name.
  - **The nominee learns only the owner's name,** through a special database function that returns nothing else. Letting them read the owner's profile would have exposed their phone and email.
  - **The rules live in the database:**
    - only the nominee can accept or decline;
    - only the owner can revoke or re-invite;
    - nobody can nominate themselves;
    - a revoked invitation can't be accepted.

    Even a bug in our screens can't break these.
  - **Invitations match on the login email,** so only the person who controls that inbox can accept.
  - **WhatsApp sharing** because Lefa doesn't send emails yet, and WhatsApp is how South African families actually talk.
- **How we know it works:**
  - **On the live database: 21 new tests** (72 in total), centred on **"an accepted nominee sees 0 policies, 0 documents, 0 files and none of the owner's profile"**.
  - **Live as Lerato:** she sees "Thandi Mokoena", and nothing else, through our API **and** when going straight to the database.
  - **37 new automated tests** across the API and website.

> **In one sentence:** "You choose who can claim for your family, and they see nothing — not a policy, not an amount — until a broker has verified a death."

### #13 The unlock: death report → broker verification → claims
- **What:**
  - **An accepted nominee reports a death** with the certificate, stored in a private `death-certificates` bucket.
  - **The family's broker (or an admin) verifies it.** One database function then, all at once:
    - marks it verified;
    - **unlocks the vault** for the nominees;
    - **creates a claim for every policy that can pay out.**
  - **Rejecting** a report needs a reason, so the family knows what to fix.
  - **Claims** move through *Not started → Submitted → Documents requested → Approved → Paid* (or Rejected). Every change is logged: who, when, from what, to what, and a note.
  - **After verification the deceased's vault is frozen:** no adding, editing or deleting policies or documents, and no revoking nominees.
- **Why each detail:**
  - **All or nothing.** Verification and claim creation happen in one transaction, so a family can never be left "verified, but with no claims".
  - **Only the family's own broker can verify.** Brokers are linked to their clients; a broker who doesn't look after a family can't see that family's reports or vault, let alone verify them. Fraud would need an accepted nominee **and** the family's own broker to be fooled.
  - **Lapsed policies get no claim.** They won't pay out, so a claim would be false hope. The nominee can still see them and ask the insurer.
  - **Nobody edits a report or claim directly.** Every change goes through a function that checks permission and writes the history. This is the audit trail insurers and regulators expect.
  - **Pending isn't unlocked.** While a report waits for the broker, the nominee still sees nothing.
- **How we know it works:**
  - **On the live database: 35 new security tests** (107 in total), covering the whole story:
    - a stranger can't report;
    - pending stays locked;
    - a nominee can't verify their own report, and neither can an unlinked broker;
    - verification creates exactly 1 claim and skips the lapsed policy;
    - only then does the nominee see the vault;
    - claim changes are logged, the vault is frozen, and strangers still see nothing.
  - **Live with the demo accounts:**
    - Sipho sees Gogo Mmabatho's unlocked vault (AVBOB paid, Assupol submitted) but **not** Jabulani's, which is still pending;
    - Sipho's own attempt to verify is refused;
    - Lerato still sees nothing of Thandi's.

> **In one sentence:** "A broker's verification is the only key: one step that unlocks the vault and opens a claim for every policy, with a full audit trail and no way for anyone to skip it."

### #14 Report a death and the unlocked vault (the nominee's side)
- **What:**
  - **"Nominated for me" shows where each vault stands:**
    - **Vault locked**, with a **Report a death** button;
    - **Pending verification**;
    - **Not accepted**, with the broker's reason and **Report again**;
    - **Vault unlocked**, with **Open vault**.
  - **Report a death (S9)** is a short, gentle form: "We're sorry for your loss. We'll help you claim everything Thandi was covered for." It asks for:
    - the date of death and a photo or scan of the certificate;
    - optionally the DHA / BI-1663 reference and a note for the broker.

    It ends on "Report submitted. Under review."
  - **The unlocked vault (S10):**
    - "Cover being claimed: R35 000 · 2 claims · 1 paid";
    - a **claim card per policy**, showing the policy number, cover, a **stepper** (*Not started → Submitted → Documents requested → Approved → Paid*), the documents to send the insurer, **Update status** with a note, and the full history;
    - policies **without** a claim (e.g. lapsed) are listed, with what to do about them.
- **Why each detail:**
  - **Few, kind words.** Whoever uses this has just lost someone. The form asks only what the broker needs, and says plainly what happens next.
  - **The certificate is checked like every upload:** by its real file type, at most 5 MB, in a private bucket. If filing the report fails, the certificate is deleted again.
  - **Only an accepted nominee can report, and only once per person.** A second report while one is open is refused before any file is stored.
  - **The vault page asks the database, not the screen,** whether it's unlocked. A locked vault returns "403 vault locked", even if someone types the address directly.
  - **The ID and bank letter appear under every claim**, because every insurer asks for them. This is where preparing documents in #11 pays off.
  - **Every claim update is logged with a note**, so the family and the broker see the same truth: who changed what, when and why.
- **How we know it works:**
  - **24 new automated tests** across the API and website. The website suite also became more robust under load: it ran **3 times in a row** with all 188 tests passing.
  - **Live as Sipho, against the real database:**
    - Mmabatho's vault opens (AVBOB paid, Assupol submitted, her ID and bank letter attached);
    - Jabulani's vault is "locked" while it's pending.
  - **Refused, live:**
    - Lerato reporting Mmabatho's death, opening her vault, or changing her claim;
    - Sipho filing a second report.

> **In one sentence:** "In the worst week of their life, a family reports the death once, and when the broker verifies it they see every policy, the documents insurers want, and exactly where each payout stands."

### #15 The broker's side: dashboard, verification and the claims pipeline
- **What:**
  - **Dashboard (S11):**
    - four numbers: *clients, pending verifications, open claims, paid this month*;
    - a **Pending death reports** table: who died, who reported it and their relationship, when, and **Review**;
    - a **Recent claim activity** feed.
  - **Verify a death (S12):**
    - the **certificate shown on the page** next to the facts: deceased, phone on file, date of death, reporter and relationship, DHA/BI-1663 reference, the family's notes;
    - each policy marked **"Becomes a claim"** or **"Lapsed: no claim"**;
    - **Verify & unlock vault** asks first, spelling out the consequence: *"This will give Sipho Ndlovu access to Jabulani Khumalo's vault and create 1 claim."*;
    - **Reject** requires a reason, which the family sees.
  - **Claims pipeline (S13):**
    - a column per stage, with cards showing client, insurer, cover and days open;
    - opening a card shows the timeline and lets the broker move the claim on, with a note the family sees.
  - **A small database change (migration 006):** a broker can now read **their own clients'** nominees, and the **name of whoever reported a death for one of their clients**, so they know who they're dealing with. Nothing wider.
- **Why each detail:**
  - **Brokers are the paying customer.** This is the screen they'd pay R15 per client per month for: what needs attention today, and where every family's money stands.
  - **Verification can't be undone,** so the confirmation names the person who'll get access and how many claims will open.
  - **A rejection with no reason leaves a grieving family stuck.** The reason goes straight to their "Nominated for me" card, next to **Report again**.
  - **Brokers only ever see their own families.** Members get 403 on every broker address. Another broker sees nothing of these families, which the database tests prove.
  - **Every claim move is logged and visible to the family,** so there's one shared version of the truth instead of WhatsApp messages and phone calls.
- **How we know it works:**
  - **On the live database: 8 new security tests** (115 in total).
  - **API: 17 new tests** (103 in total), including 403 for members on every broker route.
  - **Website: 9 new tests** (197 in total).
  - **Live as Naledi** (read-only, so the demo's pending report stays pending): 5 clients, 1 pending, 1 open claim, R15 000 paid; the certificate link opens the PDF; Thandi (a member) gets 403.

> **In one sentence:** "The broker sees which families need them today, verifies a death with the certificate in front of them, and moves every claim to paid, with the family watching the same timeline."







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
- [ ] Use a separate production Supabase project, keeping the demo/test data apart (the demo logins and their passwords are public).
- [ ] Upgrade the Render API to a paid plan so it never sleeps.
- [ ] Delete the seed secret key from Supabase once demo data is final.
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

- **Middleware:** a check that runs before an API route, like the doorman before the waiter.
- **401 / 403 / 404 / 500 / 503:** standard response codes: not logged in / not allowed / not found / our bug / temporarily down.

- **Validation:** checking input is sensible before saving it (e.g. no negative amounts).
- **CRUD:** Create, Read, Update, Delete: the four basic things you can do with stored data.

*All Must features are built. Next up: #17 polish (mobile, accessibility, dark mode), #18 README, #19 Loom demo.*
