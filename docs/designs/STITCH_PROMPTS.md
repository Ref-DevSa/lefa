# Lefa: Stitch prompts

Paste these into [Stitch](https://stitch.withgoogle.com) **in order**. Generate the design system first, then each screen as **Mobile (390px)** and **Desktop (1280px)**. Export each screen (`screen.png` + `code.html`) into `docs/designs/<screen-id>/`.

---

## 0. Design system (paste first)

```
Design system for "Lefa", a South African fintech app: a secure family insurance policy vault.
Mood: warm, dignified, trustworthy, calm. Users may be grieving. Avoid flashy or playful.
Colours:
- Primary "Lefa Green" #1F5F4A (buttons, links, active states), hover #174A3A
- Accent "Ochre" #C8902E (highlights, badges, illustrations), use sparingly
- Background "Cream" #FAF7F2, Surface white #FFFFFF, Border #E7E1D7
- Text "Ink" #1C1C1C, muted #6B6B6B
- Status: success #2E7D32, warning #B26A00, danger #B3261E, info #1F5F8A
Typography: "Plus Jakarta Sans". H1 32/40 bold, H2 24/32 semibold, body 16/24, small 14/20.
Radius 12px cards, 10px inputs/buttons. Soft shadow (0 1px 3px rgba(0,0,0,.06)).
Components: primary/secondary/ghost/danger buttons, text input with label + helper + error,
select, file upload dropzone, card, stat tile, status pill (Not started, Submitted, Documents requested,
Approved, Paid, Rejected), progress checklist item, avatar, top nav (desktop), bottom tab bar (mobile),
empty state with simple line illustration, toast, modal, lock badge.
Currency format: R85 000 (space as thousands separator). Dates: 22 Nov 2026.
Show the sheet as one design-system board.
```

## S1: Landing page

```
Landing page for Lefa using the Lefa design system. Hero: headline "Every policy. One vault. Claim-ready for the people you love."
Subtext: "South Africans hold 17 million funeral policies, yet billions go unclaimed. Lefa makes sure your cover reaches your family."
Buttons: "Start your free vault" (primary), "I'm a broker" (secondary). Hero image: warm illustration of a multi-generational
Black South African family around a table with a phone showing a vault.
Section "How it works" with 5 numbered steps: Record, Prepare, Nominate, Unlock, Claim & track (icon + 1 line each).
Stats strip: "17m funeral policies in force", "R88bn in unclaimed financial assets", "8.7m risk policies lapsed in 2025".
Pricing: 3 cards: Free R0 (3 policies, 1 nominee), Family Plus R29/month (unlimited, 3 nominees, reminders) highlighted,
Brokers R15 per client/month. Trust section: "Your nominee sees nothing until a death is verified", POPIA, encrypted documents.
Footer with links. Top nav: logo "Lefa", How it works, Pricing, Log in, Sign up.
```

## S2: Sign up / Log in

```
Auth screens for Lefa: Sign up (Full name, Email, Phone (+27), Password with strength hint, checkbox "I agree to the privacy notice (POPIA)",
primary "Create my vault") and Log in (Email, Password, "Forgot password?", "Log in"). Split layout on desktop: left a cream panel with
the quote "Make sure your cover reaches your family" and small illustration; right the form. Show an error state variant
("Incorrect email or password") and a loading button state.
```

## S3: My Vault (member dashboard)

```
Member dashboard "My Vault" for Lefa. Greeting "Dumela, Thandi". Stats row: Total active cover "R85 000", Monthly premiums "R487",
Policies "3", Documents ready "5 of 9". Policy cards grid: each card shows insurer name, policy type pill (Funeral / Life),
policy number masked "•••• 4821", cover amount, premium + debit day ("R199 · debits on the 25th"), status pill (Active / Lapsed),
document readiness progress bar "2 of 3 docs". Button "+ Add policy". Right sidebar (desktop) / section (mobile):
"Your nominee": avatar, "Lerato Mokoena · Daughter · Accepted", lock icon text "Lerato can't see your vault until a death is verified".
Navigation: desktop top nav (My Vault, Documents, Nominees, Nominated for me, profile menu); mobile bottom tab bar.
Also generate the EMPTY STATE: illustration + "Add your first policy. It takes 2 minutes." CTA.
```

## S4: Add / Edit policy

```
Add policy form for Lefa (modal on desktop, full screen on mobile). Fields: Insurer (text with suggestions: Old Mutual, Sanlam,
Hollard, Assupol, Clientele, AVBOB, Metropolitan, Other), Policy number, Policy type (Funeral, Life, Credit life, Other segmented control),
Cover amount (R), Monthly premium (R), Debit day (1–31), Status (Active, Lapsed, Paid-up), Beneficiaries (textarea),
Notes. Buttons "Save policy" and "Cancel". Show validation error state on Policy number ("Policy number is required").
```

## S5: Policy detail

```
Policy detail page for Lefa: header with insurer, policy type pill, status pill, Edit and Delete buttons. Details grid (policy number,
cover, premium, debit day, beneficiaries, notes). "Claim-ready checklist" card: items with tick/empty circle:
Certified ID copy ✓, Bank confirmation letter ✓, Policy schedule ✗ (Upload button). Below a muted section "Needed at claim time
(your nominee will upload)": Death certificate, BI-1663 notice of death, Claimant ID. Linked documents list with file icon, name, type, date.
```

## S6: Documents

```
Documents page for Lefa: drag-and-drop upload zone "Drop PDF, JPG or PNG up to 5 MB" with document type select and optional
"Link to policy" select. Filter chips by type. List/table of documents: icon, file name, type, linked policy, uploaded date,
actions (View, Delete). Badge "Private · encrypted". Show uploading progress state and empty state.
```

## S7: Nominees

```
Nominees page for Lefa: explanation card with lock icon "Your nominees see nothing until a death is verified by a broker. Then they
get your policies, documents and a claim tracker." Invite form: Nominee email, Relationship (Spouse, Child, Parent, Sibling, Other),
"Send invite". List of nominees with status pills (Invited, Accepted, Declined) and "Revoke" action.
```

## S8: Nominated for me

```
"Nominated for me" page for Lefa. Section "Invitations": card "Thandi Mokoena has nominated you as their trusted person" with
Accept / Decline buttons. Section "People who trust you": cards with name, relationship, state LOCKED (lock icon,
"Vault locked") with secondary button "Report a death"; one card UNDER REVIEW ("Death report pending verification"); one card
UNLOCKED (green, "Vault unlocked · 3 claims") with "Open vault" button. Respectful, calm tone.
```

## S9: Report a death

```
"Report a death" form for Lefa. Gentle header: "We're sorry for your loss. We'll help you claim everything Thandi was covered for."
Fields: Date of death, Death certificate upload (required dropzone), DHA reference / BI-1663 number (optional), Notes.
Info box: "A broker will verify the certificate, usually within 24 hours. You'll then see every policy and a claim checklist."
Buttons "Submit report", "Cancel". Plus a confirmation screen "Report submitted. Under review".
```

## S10: Unlocked vault & claims (nominee)

```
Unlocked vault for nominee in Lefa. Header "Thandi Mokoena's vault", subtext "Verified 23 Nov 2026". Summary: "3 claims · R85 000 total ·
1 paid". Claim cards per policy: insurer, cover amount, status stepper (Not started → Submitted → Documents requested → Approved → Paid),
"Update status" button, insurer claims phone number, list of documents with Download buttons. Expandable timeline of status changes
(who, when, note). Read-only badge on policy details.
```

## S11: Broker dashboard

```
Broker dashboard for Lefa (desktop-first, also mobile). Greeting "Good morning, Naledi". KPI tiles: Clients 42, Pending verifications 2,
Open claims 7, Paid this month R120 000. "Pending death reports" table: deceased name, reported by, date of death, submitted, "Review" button.
"Recent claim activity" feed. Sidebar nav: Dashboard, Verifications, Claims, Clients.
```

## S12: Verify death report

```
Verify death report screen for Lefa (broker). Left: document viewer showing the uploaded death certificate (placeholder image of a document).
Right: details: deceased member, ID-free details (name, phone), date of death, reported by (nominee name + relationship),
DHA reference, notes, policies that will become claims (list of 3 with cover). Buttons "Verify & unlock vault" (primary) and
"Reject" (danger, opens reason textarea). Confirmation modal "This will give Lerato access to Thandi's vault and create 3 claims."
```

## S13: Claims pipeline

```
Claims pipeline for Lefa (broker). Kanban columns: Not started, Submitted, Documents requested, Approved, Paid. Cards: client name,
insurer, cover amount, days open. Toggle to table view. Clicking a card opens a side panel: status select, note textarea, "Update",
and timeline. On mobile, a filtered list with status chips instead of kanban.
```

## S14: System states

```
Lefa system states: 403 "You don't have access to this page" with lock illustration and "Go to my vault" button; 404 "Page not found";
generic error "Something went wrong. Try again"; full-page loading skeleton for the vault.
```
