# SpendLens Design System Specification

## 1. Design Philosophy
SpendLens is designed as a calm, dense, finance-grade workspace. It rejects SaaS marketing tropes (e.g. purple/cyan gradients, floating 3D spheres, glassmorphic blur, 3-card feature columns, hyperbolic claims) in favor of the clarity, visual hierarchy, and tactile precision expected of institutional financial tools (like Bloomberg Terminal, PitchBook, or Stripe Dashboard).

Every element exists to communicate verified spend metrics, contract timelines, and evidence-backed savings with zero ambiguity.

---

## 2. Color Palette & WCAG AA Contrast Verification

### Core Tokens

| Role | Light Hex | Dark Hex | Contrast vs Canvas (Light) | Verification Status | Usage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Canvas** | `#F6F4EF` (Warm Ivory) | `#0F1216` | — | Base Background | Page canvas |
| **Surface** | `#FFFFFF` | `#171C24` | 1.1:1 | Hairline Border Separated | Card/table background |
| **Ink / Text** | `#15191F` (Charcoal) | `#F6F4EF` | **14.2:1** | Exceeds AAA (7:1) | Primary text, titles, sidebar |
| **Action Fill** | `#F28B38` (Burnt Orange) | `#F28B38` | — | Primary Buttons Only | FILLS ONLY |
| **Action Text on Fill**| `#15191F` (Charcoal) | `#15191F` | **6.46:1** | Exceeds AA (4.5:1) | Text inside orange button |
| **Action Text / Link** | `#9C4300` (Dark Orange) | `#F7A35C` | **6.15:1** on Ivory, **6.7:1** on White | Exceeds AA (4.5:1) | Standalone links & text |
| **Verified Savings** | `#23734B` (Muted Green) | `#3DB879` | **5.3:1** on Ivory, **5.8:1** on White | Exceeds AA (4.5:1) | Positive delta, savings metrics |

> [!IMPORTANT]
> **Contrast Warning Addressed:** Orange text (`#F28B38`) against warm ivory (`#F6F4EF`) fails WCAG AA ($2.4:1$). Therefore, `#F28B38` is restricted exclusively to **fills** with charcoal `#15191F` text on top ($6.46:1$). All orange text and links utilize `#9C4300` (light mode) and `#F7A35C` (dark mode), ensuring full compliance with WCAG AA ($\ge 4.5:1$).

### Neutral 8-Step Scale

| Step | Light | Dark | Purpose |
| :--- | :--- | :--- | :--- |
| **1** | `#F6F4EF` | `#0F1216` | Canvas base |
| **2** | `#EFECE3` | `#171C24` | Canvas secondary / table alternating rows |
| **3** | `#E3DEC3` | `#202732` | Surface hover / subtle container |
| **4** | `#C7C1B2` | `#2D3745` | Hairline borders & table rules |
| **5** | `#969083` | `#5C6B7E` | Disabled states / placeholder text |
| **6** | `#625D53` | `#9AA7B6` | Secondary captions / basis strings |
| **7** | `#343A40` | `#D3DBE4` | Body copy |
| **8** | `#15191F` | `#F6F4EF` | Headings & primary typography |

### Semantic Alerts
- **Success:** `#23734B` (Light) / `#3DB879` (Dark)
- **Warning:** `#8C5A00` (Light) / `#F5A623` (Dark)
- **Danger:** `#BA1A1A` (Light) / `#FF6B6B` (Dark)
- **Info:** `#0B61A4` (Light) / `#4DA3FF` (Dark)

---

## 3. Typography & Modular Scale

### Font Pairing Rationale
1. **Primary UI Sans (`Inter / system-ui`):** A neutral, dense, objective sans-serif engineered for digital interfaces and information-dense tabular displays. Avoids playful geometric quirks.
2. **Tabular Figures (`tabular-nums`):** Mandatory across all financial and metric displays. Ensures fixed-width numeric glyphs so vertical columns of currency and percentages align without horizontal jitter.
3. **Landing Headline Serif (`Charter / Georgia`):** An editorial, high-authority transitional serif reserved exclusively for primary landing headlines. Evokes traditional financial journalism (e.g. *The Economist*, *Financial Times*) rather than generic SaaS hype.
4. **Icons:** Exclusively Lucide icons with consistent `1.5px` or `1.75px` stroke width. **Zero emojis** in product interface.

### Modular Scale (4px Base Grid)
- `2xs`: 11px / 14px line-height (metadata badges, pricing source timestamps)
- `xs`: 12px / 16px line-height (table headers, secondary labels, helper text)
- `sm`: 13px / 18px line-height (dense table cell content, compact form inputs)
- `base`: 14px / 20px line-height (standard body copy, primary navigation)
- `lg`: 16px / 22px line-height (card titles, subsection headers)
- `xl`: 20px / 26px line-height (screen titles, primary section headers)
- `2xl`: 24px / 30px line-height (KPI metric displays)
- `3xl`: 30px / 36px line-height (editorial hero display)

---

## 4. Radii & Elevations

### Radii (Exactly 2 Scales)
- **Small (`4px` / `--radius-sm`):** Buttons, badges, input controls, table row highlights.
- **Medium (`8px` / `--radius-md`):** Cards, modal dialogs, slide-over sheets, command palette.
- *Strict Rule:* No pill bubbles or 16px/24px rounded corners.

### Elevations (Hairline Finance Elevation)
- **Elevation 1 (Cards & Tables):** Hairline 1px border (`#DCD8CD`) with subtle 1px shadow:
  `box-shadow: 0 1px 2px 0 rgba(21, 25, 31, 0.05), 0 0 0 1px var(--border-subtle);`
- **Elevation 2 (Modals & Command Palette):** Structured depth:
  `box-shadow: 0 4px 12px -2px rgba(21, 25, 31, 0.12), 0 0 0 1px var(--border-color);`

---

## 5. Motion Guidelines
- **Duration:** 150ms to 200ms ease-out (`cubic-bezier(0, 0, 0.2, 1)`) for state transitions only (dialog opens, hover states, accordion expands).
- **No decorative animations:** No floating gradient blobs, no looping background pulses, no celebratory confetti.
- **Accessibility:** Full `@media (prefers-reduced-motion: reduce)` overrides reduce all transition and animation durations to `0.01ms`.

---

## 6. Chart Guidelines
- **Sensible Baseline:** Always starts at 0. No truncated Y-axes that artificially exaggerate small spend variances.
- **Direct Labeling:** Series are labeled directly on or adjacent to data bars, removing detached cognitive legends.
- **Accessible Fallback:** Every visualization pairs with an accessible data-table representation.
- **Explanatory Caption:** Every chart includes a concise "What this means" caption providing immediate business context.

