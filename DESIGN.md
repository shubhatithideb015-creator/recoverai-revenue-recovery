---
name: Executive Ledger Prime
colors:
  surface: '#141313'
  surface-dim: '#141313'
  surface-bright: '#3a3939'
  surface-container-lowest: '#0f0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2b2a2a'
  surface-container-highest: '#363434'
  on-surface: '#e6e1e1'
  on-surface-variant: '#c4c7c5'
  inverse-surface: '#e6e1e1'
  inverse-on-surface: '#323030'
  outline: '#8e918f'
  outline-variant: '#444846'
  surface-tint: '#c8c6c5'
  primary: '#ffffff'
  on-primary: '#313030'
  primary-container: '#e5e2e1'
  on-primary-container: '#656463'
  inverse-primary: '#5f5e5e'
  secondary: '#c9c6c5'
  on-secondary: '#313030'
  secondary-container: '#474646'
  on-secondary-container: '#b7b4b3'
  tertiary: '#ffffff'
  on-tertiary: '#003824'
  tertiary-container: '#6ffbbe'
  on-tertiary-container: '#00734e'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e5e2e1'
  primary-fixed-dim: '#c8c6c5'
  on-primary-fixed: '#1c1b1b'
  on-primary-fixed-variant: '#474746'
  secondary-fixed: '#e5e2e1'
  secondary-fixed-dim: '#c9c6c5'
  on-secondary-fixed: '#1c1b1b'
  on-secondary-fixed-variant: '#474646'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002114'
  on-tertiary-fixed-variant: '#005236'
  background: '#141313'
  on-background: '#e6e1e1'
  surface-variant: '#363434'
  terminal-black: '#0e0e0e'
  border-subtle: '#2b2a2a'
  border-muted: '#444748'
  success-emerald: '#4edea3'
  warning-amber: '#f59e0b'
  error-crimson: '#ffb4ab'
  on-surface-muted: '#8e9192'
typography:
  display-lg:
    fontFamily: ebGaramond
    fontSize: 56px
    fontWeight: '500'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: ebGaramond
    fontSize: 32px
    fontWeight: '500'
    lineHeight: '1.2'
  headline-md:
    fontFamily: ebGaramond
    fontSize: 24px
    fontWeight: '400'
    lineHeight: '1.2'
  body-lg:
    fontFamily: hankenGrotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: hankenGrotesk
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  body-sm:
    fontFamily: hankenGrotesk
    fontSize: 13px
    fontWeight: '400'
    lineHeight: '1.4'
  data-mono:
    fontFamily: jetbrainsMono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.2'
    letterSpacing: 0.02em
  label-caps:
    fontFamily: jetbrainsMono
    fontSize: 10px
    fontWeight: '700'
    lineHeight: '1'
    letterSpacing: 0.1em
  headline-lg-mobile:
    fontFamily: ebGaramond
    fontSize: 28px
    fontWeight: '500'
    lineHeight: '1.2'
spacing:
  base: 4px
  gutter: 16px
  margin-edge: 40px
  panel-gap: 1px
  cell-padding-x: 12px
  cell-padding-y: 8px
---

## Brand & Style

This design system is a high-fidelity evolution of a digital ledger, reimagined for a professional desktop workstation environment. The brand personality is **authoritative, surgical, and elite**. It targets power users who manage high-stakes financial data and require a UI that functions like a precision instrument.

The design style is a hybrid of **Minimalism** and **Sophisticated Industrialism**. It moves away from organic textures in favor of a rigid, "blueprint-like" aesthetic. The atmosphere is defined by intentional whitespace, high-density information architecture, and a "Sophisticated Terminal" character. Every pixel serves a functional purpose, evoking an emotional response of total operational control and intellectual rigor. Visual interest is generated through typographic contrast and surgical color accents rather than decorative elements.

## Colors

The palette is optimized for long-duration focus on high-resolution displays. The foundation is a "Digital Obsidian" environment using `terminal-black` for the primary canvas to minimize eye strain and maximize the pop of data accents.

- **Primary & Secondary:** A range of warm grays and off-whites are used for high-priority information and primary interactions, ensuring maximum legibility against the dark background without the harshness of pure `#FFFFFF`.
- **Functional Accents:** `success-emerald` is used sparingly for recovered revenue and positive statuses. `warning-amber` and `error-crimson` are reserved for critical interventions and terminal failures.
- **Surface Layering:** Depth is created through tonal shifts in charcoal. `neutral_color_hex` acts as the base, while nested containers use slightly lighter tiers to signify hierarchy.
- **Borders:** Color is used structurally. `border-subtle` is the standard for grid lines, while `border-muted` is used for interactive element boundaries.

## Typography

The typographic strategy employs a triple-font hierarchy to balance editorial prestige with technical precision.

1.  **EB Garamond (Editorial):** Used for primary section titles and significant data storytelling. It introduces a high-end, "Financial Journal" aesthetic.
2.  **Hanken Grotesk (Functional):** The workhorse for the UI. It handles all body text, instructional content, and primary labels, providing a clean, modern contrast to the serif headings.
3.  **JetBrains Mono (Technical):** Specifically for the "Ledger" aspects—transaction IDs, timestamps, and currency values. It signals accuracy and allows for perfect vertical alignment in dense data columns.

On widescreen workstations, use generous tracking for `label-caps` to enhance the "blueprint" aesthetic. `display-lg` should be used sparingly for high-impact dashboard summaries.

## Layout & Spacing

This design system utilizes a **High-Density Fixed Grid** model tailored for professional 1440px+ displays. 

- **The Ledger Grid:** A 12-column system where columns are separated by 1px vertical rules (`border-subtle`) instead of wide gutters. This maximizes horizontal space for complex data tables.
- **Rhythm:** All spacing is derived from a 4px baseline. Desktop environments favor "compact" density, with inner container padding rarely exceeding 16px.
- **Desktop Layout:** Content is organized into modular "blades" or panels. Sidebars are fixed and utilize the 1px border style to feel integrated into the terminal environment.
- **Breakpoints:** On desktop (1280px+), the layout expands to show multi-pane views. On smaller screens, panels stack vertically, and the editorial headers (`display-lg`) scale down to `headline-lg-mobile` to maintain the tight, engineered feel.

## Elevation & Depth

This system rejects soft shadows and blurs. Hierarchy is established through **Structural Tonal Layering** and fine-line borders.

- **Surface Tiers:** Backgrounds use the darkest charcoal. Active work canvases use a slightly lighter shade. Floating elements (like dropdowns) use the lightest surface tier to suggest a "step up" in the stack.
- **Fine-Line Borders:** 1px solid borders are the primary tool for defining boundaries. This creates a "schematic" or "CAD" visual style.
- **Inverted Focus:** Instead of rising via shadow, selected or active elements are signaled by a 1px `primary` border or a subtle shift in background luminance.
- **High-Contrast Overlays:** Modals do not use heavy blurs; they use a semi-transparent dark overlay (`terminal-black` at 80% opacity) to keep the user's focus on the sharp-edged active panel.

## Shapes

The shape language is strictly **Sharp (0px)**. 

All containers, buttons, inputs, and chips must have 90-degree corners. This reinforces the metaphor of a rigid, precise digital ledger. The only exceptions are:
1. **Status Pips:** 6px circular dots used to indicate "Live" status or "Active" connectivity.
2. **User Avatars:** Circles are used here to provide a singular, deliberate visual break from the grid, identifying human elements within the machine.

## Components

- **Buttons:** Sharp-edged and compact. Primary buttons are `primary` color with `terminal-black` text. Secondary buttons are "Ghost" style with a 1px border. Label text is always `label-caps`.
- **Data Tables (The Core):** High-density cells with 1px horizontal dividers. Use `data-mono` for all numeric values. Row hover states should trigger a subtle background highlight and a 1px left-accent border in `primary`.
- **Input Fields:** Minimalist design using a 1px bottom-border only in the rest state, becoming a full 1px box on focus. Placeholder text uses `body-sm`.
- **Operational Chips:** Rectangular, sharp tags with a `data-mono` label. Status is indicated by a small circular pip (Success Emerald or Warning Amber) nested inside the chip.
- **Breadcrumbs:** Rendered in `label-caps` with a thin `/` separator to maintain the technical, folder-path terminal aesthetic.
- **The Ledger Timeline:** A vertical 1px line connecting various recovery events, using `data-mono` for timestamps and `headline-md` (Serif) for the aggregate recovered totals.