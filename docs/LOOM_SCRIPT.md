# Lefa: Loom pitch + demo script (≈ 5 minutes)

Loom's free plan stops at 5 minutes, so each part has a target time. **Say the lines in your own words**: they're a guide, not a teleprompter. Words in *italics* are what you click.

---

## Before you press record (10 minutes)

1. **Reset the demo** so there's a death to verify:
   ```bash
   npm run db:reset-demo
   ```
2. **Wake the API.** Open https://lefa-api.onrender.com/api/health and wait for `{"status":"ok"}`. The free server can take up to a minute after a quiet spell.
3. **Log in to four accounts in four separate browser windows.** Each browser window type keeps its own login. Password for all: `LefaDemo2026!`.

   | Window | Log in as | Start on |
   |---|---|---|
   | Chrome | `thandi@lefa.test` | My Vault |
   | Chrome **Incognito** (Ctrl+Shift+N) | `lerato@lefa.test` | Nominated for me |
   | Edge | `broker@lefa.test` | Dashboard |
   | Edge **InPrivate** (Ctrl+Shift+N) | `sipho@lefa.test` | Nominated for me |

4. Set every window to **100% zoom**, close other tabs, and turn on **Do Not Disturb** (no WhatsApp pop-ups).
5. In Loom, choose **Screen + camera**, with your camera bubble bottom-left (it won't hide the buttons).
6. Do one practice run, then `npm run db:reset-demo` again before the real take.

---

## 0:00 – 0:35 · The problem (camera on, Thandi's vault on screen)

> "Hi, I'm Refilwe Segoe, and this is **Lefa**, which means *inheritance* in Sesotho.
>
> When Gogo Mmabatho passed away, her family knew she *had a funeral policy*, but not which insurer, or the number. They borrowed R25 000 from a mashonisa to bury her. Months later they found one policy in a drawer. Another had lapsed because the debit date didn't match her SASSA day.
>
> That's not rare. South Africans hold **17 million funeral policies**, around **R88 billion** in assets sits unclaimed, and **8.7 million policies lapsed last year**."

## 0:35 – 1:00 · The idea and who pays

> "Lefa is a family insurance vault. You record every policy and claim document once, and nominate someone you trust. **They see nothing**, until a broker verifies a death. Then they get every policy and a claim tracker.
>
> Families can use it free, or pay R29 a month. **Brokers pay R15 per client**, because Lefa prevents lapses, which protects their commission, and it saves them days of claim admin."

## 1:00 – 1:55 · The vault (Chrome · Thandi)

*Point to the four tiles.*
> "This is Thandi's vault: **R85 000** of active cover across two insurers, **R487** a month, and her **next debit is the 25th**, so she knows to keep money in the account."

*Point to the orange banner.*
> "Lefa warns her that her Clientele policy has **lapsed**. It won't pay out, so she needs to act now, not after a funeral."

*On the Old Mutual card, click **View policy**.*
> "Each policy has a **claim-ready checklist**: her ID, bank letter and policy schedule are uploaded, privately. View links expire after 60 seconds."

*Click **Back to My Vault**, point to **Your nominees**.*
> "Her daughter Lerato is her nominee, and Lerato **can't see any of this**."

## 1:55 – 2:15 · The promise (Chrome Incognito · Lerato)

> "Here's Lerato's view. She's accepted, but all she sees is Thandi's name and **'Vault locked'**. No amounts, no policies. That's enforced by the database itself, not just this screen."

## 2:15 – 3:15 · The unlock (Edge · broker)

> "Now the broker. Naledi sees the families she looks after, and one **death report waiting**: Sipho has reported that his father, Jabulani, has died."

*Click **Review**.*
> "She has the **death certificate** right here next to the details: who reported it, their relationship, and the BI-1663 reference. And Lefa shows which policies will become claims."

*Click **Verify & unlock vault**, read the dialog aloud.*
> "Because this can't be undone, Lefa spells it out: *this will give Sipho access to Jabulani's vault and create one claim.*"

*Click **Yes, verify**.*
> "In one step, the death is verified, the vault unlocks, and a claim opens for every policy that can pay out."

## 3:15 – 4:05 · The family claims (Edge InPrivate · Sipho)

*Refresh **Nominated for me**.*
> "On Sipho's side, Jabulani's vault is now **unlocked**."

*Click **Open vault** on Jabulani.*
> "He sees his father's Sanlam policy, R60 000, that he might never have known about, and a claim tracker."

*Click **Update status** → **Submitted**, note "Submitted at the Sanlam branch" → **Save**.*
> "When he submits the claim, he updates it here, and the broker sees the same timeline."

*Go back and open **Gogo Mmabatho's** vault.*
> "And for his grandmother's AVBOB policy, the claim went all the way to **paid**: R15 000, without a mashonisa."

## 4:05 – 4:40 · How it's built (any window, or show the README on GitHub)

> "Under the hood: React and Tailwind on Vercel, an Express API on Render, and Supabase Postgres.
>
> The privacy rules live in the database, using **Row Level Security**. A nominee literally gets zero rows until a death is verified, and only the family's own broker can verify it.
>
> It's tested at every layer: **115 database security tests** that try to break in, **over 100 API tests** and **almost 200 front-end tests**, all running on every pull request."

## 4:40 – 5:00 · Close (camera on)

> "Lefa makes sure the cover families already pay for **actually reaches them**, starting with brokers, who already have their trust.
>
> The live link and test logins are in the README. Thanks for watching."

---

## After recording

1. In Loom, copy the **share link**.
2. Add it to the README's *Loom pitch + demo* row and to the final message.
3. Run `npm run db:reset-demo` so reviewers also find a report to verify.

## If something goes wrong while recording

| Problem | What to do |
|---|---|
| A page spins for a while | Say "the free server is waking up", or pause the recording and resume when it loads. |
| You already verified Jabulani in a practice run | `npm run db:reset-demo`, then refresh the broker and Sipho windows. |
| A window logged out | Log back in with `LefaDemo2026!`. Loom can trim the gap afterwards. |
| You run over 5 minutes | Cut the "How it's built" section to one sentence about Row Level Security and the tests. |
