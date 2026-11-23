# Lefa designs

Generated in [Stitch](https://stitch.google.com/projects/15454914779053559520) from [STITCH_PROMPTS.md](STITCH_PROMPTS.md), exported 23 Nov 2026. Each folder has `screen.png` (the design) and `code.html` (Stitch's HTML/Tailwind export, used as a visual reference only).

| Screen | PRD | Folder | Variants |
|---|---|---|---|
| Design system | — | [00_design_system](00_design_system/) | [board](00_design_system/board/screen.png), [DESIGN.md](00_design_system/DESIGN.md) |
| S1 Landing | — | [s1_landing](s1_landing/) | [desktop](s1_landing/desktop/screen.png), [hero illustration](s1_landing/hero_illustration/screen.png) |
| S2 Sign up / Log in | M1 | [s2_auth](s2_auth/) | [sign up](s2_auth/sign_up/screen.png), [log in](s2_auth/log_in/screen.png), [error + loading](s2_auth/log_in_error_loading/screen.png) |
| S3 My Vault | M2 | [s3_my_vault](s3_my_vault/) | [vault](s3_my_vault/vault/screen.png), [empty state](s3_my_vault/empty_state/screen.png) |
| S4 Add / Edit policy | M2 | [s4_policy_form](s4_policy_form/) | [desktop modal](s4_policy_form/desktop_modal/screen.png), [mobile](s4_policy_form/mobile/screen.png) |
| S5 Policy detail | M2, M4 | [s5_policy_detail](s5_policy_detail/) | [desktop](s5_policy_detail/desktop/screen.png) |
| S6 Documents | M4 | [s6_documents](s6_documents/) | [desktop](s6_documents/desktop/screen.png) |
| S7 Nominees | M3 | [s7_nominees](s7_nominees/) | [desktop](s7_nominees/desktop/screen.png) |
| S8 Nominated for me | M3 | [s8_nominated_for_me](s8_nominated_for_me/) | [desktop](s8_nominated_for_me/desktop/screen.png) |
| S9 Report a death | M5 | [s9_report_death](s9_report_death/) | [form](s9_report_death/form/screen.png), [submitted](s9_report_death/submitted/screen.png) |
| S10 Unlocked vault & claims | M5 | [s10_unlocked_vault](s10_unlocked_vault/) | [desktop](s10_unlocked_vault/desktop/screen.png) |
| S11 Broker dashboard | M5 | [s11_broker_dashboard](s11_broker_dashboard/) | [desktop](s11_broker_dashboard/desktop/screen.png), [mobile](s11_broker_dashboard/mobile/screen.png) |
| S12 Verify death report | M5 | [s12_verify_death](s12_verify_death/) | [desktop](s12_verify_death/desktop/screen.png) |
| S13 Claims pipeline | M5 | [s13_claims_pipeline](s13_claims_pipeline/) | [desktop](s13_claims_pipeline/desktop/screen.png), [mobile](s13_claims_pipeline/mobile/screen.png) |
| S14 System states | — | [s14_system_states](s14_system_states/) | [403](s14_system_states/403/screen.png), [404](s14_system_states/404/screen.png), [error](s14_system_states/error/screen.png), [loading skeleton](s14_system_states/loading_skeleton/screen.png) |

## Notes for building from these

- **Colours:** Stitch's palette uses a deeper primary green (`#004734`) with our Lefa Green `#1F5F4A` as the container shade. Code tokens in `client/src/index.css` are aligned to these exports in #17.
- **Mobile:** screens without a mobile export follow the design system's mobile patterns (bottom tab bar, stacked cards, full-screen forms).
- **Don't build Stitch's invented claims.** Some exports include filler that isn't true of Lefa and must not appear in the app: an FSP licence number ("Authorised Financial Services Provider • FSP 51842"), "Identity verified via Home Affairs / NPR linked", "reconciled with underwriter registries", "instant bereavement advance payout", a support phone number, and a "Generate PDF" with a hash. Lefa isn't an FSP, has no Home Affairs integration, and doesn't pay out claims. Deaths are verified by a broker or admin (PRD M5).
