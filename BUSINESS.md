# Lefa: Business Case

> **Lefa** (Sesotho/Setswana: *inheritance, legacy*)
> **One-line pitch:** Lefa keeps every funeral and life policy a family pays for in one claim-ready vault, so when someone dies, the cover actually reaches the people they left behind.

---

## 1. The problem

*A representative story (composite, based on common South African experiences):*

> When Gogo Mmabatho passed away in Mamelodi, her family knew she "had a funeral policy". Nobody knew which insurer it was with, the policy number, or that she was also paying a second policy through a retail store and a third through her church burial society. The family borrowed R25 000 from a mashonisa (informal moneylender) to bury her in time. Months later they found one policy document in a drawer. The second policy had lapsed eight months earlier because the debit order date didn't match her SASSA pay date. The third was never found.

This is not rare. It's the system working as designed, while families stay in the dark.

| Fact | Figure | Source |
|---|---|---|
| Active funeral policies in SA | **17 million** (of 36.8m risk policies, June 2025) | ASISA |
| New funeral policies sold in 2025 | **6.2 million** | ASISA |
| Risk policies that **lapsed** in 2025 | **8.7 million** (up from 8.2m in 2024) | ASISA |
| Unclaimed financial assets in SA | **~R88.5 billion** | FSCA, 2025 Budget |
| Share of unclaimed assets that are insurance benefits | **~38%** | FSCA (2022 data) |

**Who has the problem?**
- **Families (beneficiaries):** they don't know which policies exist, where the documents are, or how to claim. They need cash for a funeral within 7–10 days.
- **Policyholders:** many people hold 2–4 policies with different insurers, retailers and societies, with debit orders on different dates and no single view of what they're covered for, what they're paying, or what's about to lapse.
- **Brokers and funeral parlours:** they lose clients to lapses and spend hours chasing documents (certified ID copies, death certificates, BI-1663 notices of death, bank confirmation letters) at the worst moment in a family's life.

**How often?** South Africa records over 500 000 deaths a year, and most families face a funeral claim at least once every few years.

**What does it cost today?** Unclaimed benefits that never reach families. Funeral debt from mashonisas at 30%+ interest. Premiums paid for years on policies that lapse just before they're needed. Days of admin chasing documents while grieving.

---

## 2. The customer

| | Who | Pays? |
|---|---|---|
| **Primary user** | South African policyholders aged 30–65, often the family "organiser", who manage cover for parents, children and extended family | Free tier; Family Plus subscription |
| **Secondary user** | The **nominee**: a trusted family member who receives access when the policyholder dies | Free |
| **Paying business customer** | Independent **brokers / financial advisers** and **funeral parlours** who manage dozens to hundreds of family clients | Monthly per-client licence |

---

## 3. The solution (one sentence)

**Lefa is a secure family insurance vault: you record every policy and claim document once, nominate someone you trust, and when a death is verified Lefa unlocks a claim-ready pack and a live claim tracker for every policy.**

How it works:
1. **Record:** add each policy (insurer, policy number, type, cover, premium, debit day, beneficiaries) and see one total: *"R85 000 funeral cover across 3 insurers"*.
2. **Prepare:** upload the documents each claim will need (ID, marriage certificate, bank letter) into a private, encrypted vault. A per-policy checklist shows what's missing.
3. **Nominate:** invite a trusted person. They know they've been nominated, but **can't see anything until a death is verified.**
4. **Unlock:** the nominee reports a death and uploads the death certificate. A broker (or Lefa admin) verifies it, and the vault opens to the nominee.
5. **Claim and track:** every policy gets a claim card (Submitted → Documents requested → Approved → Paid) so the family knows exactly where each payout stands.

---

## 4. The impact

**What changes if we succeed:** families claim *all* the cover they paid for, on time, without borrowing to bury their loved ones.

| Metric | How we measure it (in-app) | Year-1 target |
|---|---|---|
| Cover made visible | Total rand value of policies recorded in vaults | R500m |
| Claim readiness | % of policies with a complete document checklist | 60% |
| Claims found | Policies claimed via Lefa that the nominee didn't know existed (post-claim survey) | Tracked from first claim |
| Time to payout | Days from death report to "Paid" status | < 10 days median |
| Lapses prevented | Premium-due reminders acted on before a missed debit (Should-have feature) | Tracked from v1.1 |

---

## 5. The money

Freemium for families, paid licences for businesses.

| Plan | Price | Includes |
|---|---|---|
| **Lefa Free** | R0 | Up to 3 policies, 1 nominee, 10 documents |
| **Lefa Family Plus** | **R29 / month** | Unlimited policies and documents, 3 nominees, premium-due reminders |
| **Lefa for Brokers** | **R15 per active client / month** (min. R299) | Client dashboard, death verification, claims pipeline, Family Plus for all their clients |
| **Lefa for Funeral Parlours** | **R499 / month** | Claims assistance dashboard + referral listing |

**Unit economics (illustrative):** one broker with 80 clients = R1 200/month. 100 brokers = **R1.44m ARR** before any consumer subscriptions. Infrastructure cost per user is cents (managed Postgres + object storage).

**Later revenue (not in MVP):** anonymised, consented insights for insurers on lapse risk; a partner API for insurers to push policy status into vaults.

---

## 6. Go-to-market: the first 100 customers

1. **Brokers first (B2B wedge).** Five independent brokers in Gauteng × 20 clients each = 100 families onboarded *by someone they already trust*. Brokers buy because Lefa cuts lapses (protecting their commission) and claim admin time.
2. **Funeral parlours.** They meet families at the moment of need. A parlour that helps a family find all their policies is a parlour that gets the business. Lefa becomes their claims-assistance tool, and every claim they handle shows the next generation why to start a vault.
3. **Community channels.** Church groups, stokvels and burial societies: a 15-minute "Know your cover" session with on-the-spot sign-up. WhatsApp share links ("I've nominated you on Lefa").
4. **Content.** Short TikTok / Facebook explainers: *"Does your family know about your funeral policy?"* Plus a free "how to claim" guide per insurer.

---

## 7. The competition

| Alternative | What it does | Why Lefa is different |
|---|---|---|
| **ASISA / FSCA unclaimed-benefits search** | Search for a deceased person's unclaimed policies | Reactive and slow: it starts *after* the money is lost. Lefa works *before* death and makes claims ready on day one. |
| **Individual insurer apps** | Show one insurer's policies | Families hold policies across 2–4 providers. Lefa shows all of them in one place. |
| **Broker platforms (e.g. adviser policy-aggregation tools)** | Give the *adviser* a portfolio view | Built for the adviser, not the family. No nominee, no death-triggered access, no claim checklist. |
| **Paper file / "the drawer"** | Policy documents kept at home | Gets lost, isn't shared, nobody knows what's missing. |
| **Digital will / estate apps** | Wills and estate planning | Aimed at wealthier users and long estate processes. Lefa focuses on the funeral cover that 17 million mostly lower- and middle-income households depend on, and on the 7-day window to bury. |

**Why we win:** Lefa is the only product built around **the nominee**, the person who actually has to claim. Privacy-first unlock (verified death only), a claim checklist built around South African requirements (BI-1663, certified ID, bank letter), and a B2B channel that pays from day one.

---

## 8. The app: day-one Must features

1. **Accounts and roles:** sign-up/log-in as **Member** (policyholder and/or nominee), **Broker**, or **Admin**, with permissions enforced in the database.
2. **Policy vault:** add, edit and remove policies; see total cover and monthly premiums.
3. **Nominee invite and protected access:** invite by email; the nominee sees nothing until a death is verified (enforced by row-level security).
4. **Claim-ready documents:** per-policy checklist; upload files to a private storage bucket; download through short-lived signed links.
5. **Death report → verification → claim tracker:** the nominee reports a death with the certificate; a broker/admin verifies it; claim cards for each policy move through statuses with a history log.

See [docs/PRD.md](docs/PRD.md) for the full specification.

---

## Sources
- ASISA: [SA life insurers conclude H1 2025 with R4.8 trillion AUM](https://www.asisa.org.za/media-releases/sa-life-insurers-conclude-the-first-half-of-2025-with-assets-under-management-of-r48-trillion/) (17m funeral policies)
- Moonstone: [ASISA insurers pay out 94% of death claims in 2025](https://www.moonstone.co.za/asisa-insurers-pay-out-94-of-death-claims-in-2025/)
- BusinessTech: [Big changes for R88 billion in unclaimed assets](https://businesstech.co.za/news/budget-speech/852396/big-changes-for-r88-billion-in-unclaimed-assets-in-south-africa/)
- Daily Maverick: [Unclaimed insurance benefits run into the billions](https://www.dailymaverick.co.za/article/2024-05-02-unclaimed-insurance-benefits-run-into-the-billions-but-payouts-are-increasing)
- IOL: [ASISA reports R626 billion in life insurance claims paid in 2025](https://iol.co.za/personal-finance/financial-planning/2026-04-04-asisa-reports-r626-billion-in-life-insurance-claims-paid-in-2025/)
