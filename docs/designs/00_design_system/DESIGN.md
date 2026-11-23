---
name: Dignified Sanctuary
colors:
  surface: '#fcf9f4'
  surface-dim: '#dcdad5'
  surface-bright: '#fcf9f4'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3ee'
  surface-container: '#f0ede9'
  surface-container-high: '#ebe8e3'
  surface-container-highest: '#e5e2dd'
  on-surface: '#1c1c19'
  on-surface-variant: '#404944'
  inverse-surface: '#31302d'
  inverse-on-surface: '#f3f0eb'
  outline: '#707974'
  outline-variant: '#bfc9c2'
  surface-tint: '#2b6953'
  primary: '#004734'
  on-primary: '#ffffff'
  primary-container: '#1f5f4a'
  on-primary-container: '#97d7bc'
  inverse-primary: '#94d4b9'
  secondary: '#805600'
  on-secondary: '#ffffff'
  secondary-container: '#fdbe58'
  on-secondary-container: '#724d00'
  tertiary: '#004165'
  on-tertiary: '#ffffff'
  tertiary-container: '#165984'
  on-tertiary-container: '#99cfff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#b0f0d4'
  primary-fixed-dim: '#94d4b9'
  on-primary-fixed: '#002116'
  on-primary-fixed-variant: '#0a513d'
  secondary-fixed: '#ffddaf'
  secondary-fixed-dim: '#fabc56'
  on-secondary-fixed: '#281800'
  on-secondary-fixed-variant: '#614000'
  tertiary-fixed: '#cce5ff'
  tertiary-fixed-dim: '#94ccfd'
  on-tertiary-fixed: '#001d31'
  on-tertiary-fixed-variant: '#004b73'
  background: '#fcf9f4'
  on-background: '#1c1c19'
  surface-variant: '#e5e2dd'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.015em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md-semibold:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm-medium:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 18px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.03em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system establishes a dignified, grounded, and deeply reassuring digital vault for family policy management and estate continuity. The brand operates in sensitive life moments—often when family members are experiencing bereavement, vulnerability, or critical transitions. The design ethos rejects clinical, cold enterprise finance patterns as well as patronizing, overly playful consumer fintech tropes.

### Core Tenets
- **Dignified Solace:** Calm, measured visual pacing. No jarring motion, aggressive alerts, or hyperactive gamification.
- **Steadfast Clarity:** Highly legible forms, transparent document states, and unambiguous instructions to reduce cognitive load during times of stress.
- **Warm Heritage:** Grounded in an earthy, warm organic palette that feels familial and protective rather than sterile and bureaucratic.

### Visual Style
The design blends **Minimalism** with subtle **Tactile Warmth**. It relies on warm off-white canvases, structured borders, understated shadows, and generous structural breathing room.

## Colors

The palette is tuned specifically for calm reassurance, readability, and respect.

### Primary & Accent
- **Primary ("Lefa Green" #1F5F4A):** Evokes stability, growth, endurance, and quiet authority. Used for primary CTAs, active structural indicators, and key structural landmarks. Hover state deepens to `#174A3A`.
- **Secondary ("Ochre" #C8902E):** Rooted in warmth and vitality. Deployed strictly as an accent for verified badges, critical claim highlights, and subtle informational emphasis. Never used for destructive states.

### Surfaces & Neutrals
- **Background ("Cream" #FAF7F2):** Replaces clinical pure white backgrounds with a warm, comforting tone that mitigates eye fatigue.
- **Surface (#FFFFFF):** Reserved for elevated surfaces, cards, and input fields to construct crisp, reliable readability.
- **Border (#E7E1D7):** Low-contrast architectural divider maintaining quiet boundary definitions without harsh gridlines.
- **Text Ink (#1C1C1C):** High-contrast neutral for effortless legibility.
- **Text Muted (#6B6B6B):** Secondary neutral for metadata, subheaders, and helper copy.

### Functional & Status Colors
- **Success (#2E7D32):** Policy active, document approved, payout disbursed.
- **Warning (#B26A00):** Action pending, policy expiring, grace period active.
- **Danger (#B3261E):** Action overdue, claim rejected, missing critical legal attestation.
- **Info (#1F5F8A):** Secure vault metadata, estate notes, informational notifications.

## Typography

The single typeface **Plus Jakarta Sans** provides a warm, modern, and human grotesque texture that remains sharp and approachable across screen densities.

### Localization & Conventions
- **Currency:** Express South African Rand values with the `R` prefix, followed immediately by whole and thousands groupings separated by a non-breaking space (e.g., `R85 000`, `R1 250 000.00`). Tabular numerical alignment is mandatory within financial data tables and stat tiles.
- **Dates:** Format dates using the day-month-year order without leading zeroes on days, utilizing abbreviated text months to prevent ambiguity (e.g., `22 Nov 2026`).
- **Identity Numbers:** South African national ID numbers (13 digits) must be visually segmented into readable chunks (`YYMMDD SSSS C AZ`) via spaced read-only blocks for effortless verification.

## Layout & Spacing

The interface applies a structured, human-centric responsive grid anchored by generous negative space to minimize anxiety.

### Grid & Breakpoints
- **Mobile (< 640px):** 4-column fluid layout with `1rem` outer margins and `1rem` gutters. Elements reflow vertically into unified card stacks.
- **Tablet (640px – 1024px):** 8-column layout with `1.5rem` margins and `1.25rem` gutters. Two-column groupings for policy stats and document status overviews.
- **Desktop (> 1024px):** 12-column layout max-width constrained to `1200px` centered on canvas. `2rem` margins and `1.5rem` gutters. Sidebars pin to a consistent 3-column span; primary workflows occupy 9 columns.

### Rhythmic Discipline
Use strict multiples of 4px. Interior card padding uses `1.5rem` on desktop and scales to `1rem` on mobile. Tight relationships (label to input, title to subtitle) maintain a `0.5rem` ceiling.

## Elevation & Depth

Visual hierarchy prioritizes quiet reassurance over floating theatricality.

### Shadow Characteristics
- **Level 1 (Subtle Rest):** `0 1px 3px rgba(0, 0, 0, 0.06), 0 4px 12px rgba(0, 0, 0, 0.04)`. Applied to resting cards, list tiles, and dropdown containers.
- **Level 2 (Active Focus / Modals):** `0 8px 24px rgba(28, 28, 28, 0.08), 0 2px 6px rgba(28, 28, 28, 0.04)`. Applied to modals, toast alerts, and active popovers.

### Surface Architecture
Layering is tonal: Cream (`#FAF7F2`) grounds the background canvas, while content rests on pure White (`#FFFFFF`) cards bounded by subtle structural strokes (`#E7E1D7`). Avoid aggressive pure black dropshadows; all shadow hues are diffused by soft ambient light.

## Shapes

The geometric form language provides welcoming softness without looking childlike. 

- **Cards & Major Structural Surfaces:** Fixed `12px` border radius (`rounded-lg`).
- **Inputs, Buttons, and Select Menus:** Fixed `10px` border radius (`rounded-md`).
- **Badges, Status Pills, and Avatars:** Fully rounded pill radius (`9999px`).
- **Icons & Badges Frames:** Soft `8px` squircle shapes for iconography enclosures.

## Components

### Buttons
- **Primary:** Background `#1F5F4A`, text `#FFFFFF`, radius `10px`, height `48px`, font `body-md-semibold`. Hover: `#174A3A`. Focus: 2px ring with `2px` offset in `#1F5F4A`.
- **Secondary:** Background `#FFFFFF`, border `1px solid #1F5F4A`, text `#1F5F4A`, radius `10px`, height `48px`. Hover: background `rgba(31, 95, 74, 0.04)`.
- **Ghost:** Transparent background, text `#1F5F4A`, padding `0 1rem`. Hover: background `rgba(31, 95, 74, 0.06)`.
- **Danger:** Background `#FFFFFF`, border `1px solid #B3261E`, text `#B3261E`. Hover: background `#B3261E` with `#FFFFFF` text.

### Form Inputs & Selects
- **Text Inputs:** Height `48px`, border `1px solid #E7E1D7`, background `#FFFFFF`, radius `10px`, text `#1C1C1C`. Helper text in `body-sm` `#6B6B6B`.
- **Focus State:** Border `#1F5F4A` with subtle `0 0 0 3px rgba(31, 95, 74, 0.12)`.
- **Error State:** Border `#B3261E`, helper message `#B3261E` preceded by an inline warning indicator.
- **Select Dropdown:** Same dimensions as inputs; contains a subtle downward chevron `#6B6B6B` rotated 180° when expanded.

### File Upload Dropzone
- Bounded by a dashed `2px` border in `#E7E1D7`, background `#FFFFFF`, radius `12px`, padding `2rem`.
- Features an understated folder or document line icon in `#1F5F4A`, an explicit label ("Drop death certificate or policy schedule here"), supported formats notice (PDF, JPG, PNG up to 15MB), and an explicit secondary "Browse files" button.

### Cards & Stat Tiles
- **Vault Cards:** Surface `#FFFFFF`, border `1px solid #E7E1D7`, shadow level 1, radius `12px`, padding `1.5rem`.
- **Stat Tile:** Minimal card housing policy valuation or claim amounts. Small muted label (`label-md`), prominent numerical value in tabular Plus Jakarta Sans Bold, and contextual micro-pills.

### Status Pills
Pill shape (`9999px`), padding `4px 10px`, typography `label-sm`.
- **Not started:** Background `#F2EFE9`, text `#6B6B6B`.
- **Submitted:** Background `rgba(31, 95, 138, 0.10)`, text `#1F5F8A`.
- **Documents requested:** Background `rgba(200, 144, 46, 0.12)`, text `#B26A00`.
- **Approved:** Background `rgba(46, 125, 50, 0.10)`, text `#2E7D32`.
- **Paid:** Background `#2E7D32`, text `#FFFFFF`.
- **Rejected:** Background `rgba(179, 38, 30, 0.10)`, text `#B3261E`.

### Progress Checklist Item
- Horizontal card flex layout with a circular state icon (24px): checkmark inside `#2E7D32` circle for complete, dashed neutral circle for pending, amber clock icon for under review. Text displays action name and required supporting document metadata.

### Secure Lock Badge
- Inline or header badge containing a 12px padlock glyph alongside copy: "256-bit Encrypted Vault". Uses Ochre tint (`rgba(200, 144, 46, 0.12)`) and text `#8C6219` to provide warm assurance of institutional security.

### Navigation Architecture
- **Desktop Top Nav:** Height `72px`, background `#FFFFFF`, bottom border `1px solid #E7E1D7`. Houses left-aligned brand mark, secure badge indicator, global search/vault switcher, and user avatar.
- **Mobile Bottom Tab Bar:** Fixed height `64px`, background `#FFFFFF`, top border `1px solid #E7E1D7`. 4 primary destinations (Vault, Beneficiaries, Claims, Support) with 20px stroked icons and `label-sm` labels.

### Modal & Toast
- **Modal:** Centered dialog, radius `16px`, max-width `540px`, backdrop `#1C1C1C` at 40% opacity with 4px backdrop blur. Header contains clear dismissal and compassionate confirmation messaging.
- **Toast:** Floating pill container, bottom right on desktop, bottom-centered on mobile. Dark ink surface `#1C1C1C`, text `#FAF7F2`, with corresponding semantic status icon.

### Empty States
- Handled with delicate, single-weight line illustrations (no character cartoons). Centered layout, max-width `360px`, `headline-sm` heading, `body-md` secondary explanation, followed by a solitary primary action button.