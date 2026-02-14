# TOKENS.md — Plainly

This file defines the ONLY allowed design tokens.
Do not introduce new colors, spacing, or typography values.

Why:
Design consistency and visual calm depend on strict reuse.

---

## Color Tokens

### Light mode (default)

**Background**
- `--color-bg-primary`: #FDFCFB (warm off-white) — main screen backgrounds
- `--color-bg-secondary`: #F5F0EB (warm cream) — illustration areas, cards, input backgrounds
- `--color-bg-tertiary`: #EDE6DF — hover states, pressed states

**Text**
- `--color-text-primary`: #2C2826 (warm charcoal) — headings, body text
- `--color-text-secondary`: #8C8480 (muted warm grey) — subtexts, hints, timestamps
- `--color-text-tertiary`: #B5AFA9 — placeholders, disabled text
- `--color-text-inverse`: #FFFFFF — text on accent (buttons, active tabs)

**Borders & dividers**
- `--color-border-default`: #E8E0D8 — dividers, card borders

**Accent**
- `--color-accent-primary`: #C45D3E (terracotta) — buttons, active tabs, active dots, mic icon, waveform bars, links
- `--color-accent-hover`: #B35236 — pressed/hover states

**Tabs**
- Tab inactive background: #F5F0EB
- Tab inactive text: #8C8480
- Tab active background: #C45D3E
- Tab active text: #FFFFFF

**Status**
- `--color-success`: #5C8A5E — saved toast, checkmarks
- `--color-success-subtle`: (use for success toast background if needed)
- `--color-warning`: #C4873E
- `--color-error`: #BF4A3A

**Shadow**
- `--color-shadow`: rgba(44, 40, 38, 0.06) — warm shadow, not pure black

---

### Dark mode

**Background**
- `--color-bg-primary`: #1C1917 (warm near-black)
- `--color-bg-secondary`: #292320 (warm dark brown) — illustration areas, cards
- `--color-bg-tertiary`: #362E2A — hover/pressed states

**Text**
- `--color-text-primary`: #F5F0EB (warm white)
- `--color-text-secondary`: #8C8480
- `--color-text-tertiary`: #5C5550

**Borders & dividers**
- `--color-border-default`: #3D3530

**Accent**
- `--color-accent-primary`: #D4714F (lighter terracotta for dark backgrounds)
- `--color-accent-hover`: #E07D5A

**Tabs**
- Tab inactive background: #292320
- Tab inactive text: #8C8480
- Tab active background: #D4714F
- Tab active text: #FFFFFF

**Status**
- `--color-success`: #6FA172

**Shadow**
- `--color-shadow`: rgba(0, 0, 0, 0.2)

---

## Typography Tokens

Use Satoshi as primary typeface (see DESIGN_SYSTEM.md).

### Font sizes
- `--font-size-xs`: 12
- `--font-size-sm`: 14
- `--font-size-md`: 16
- `--font-size-lg`: 20
- `--font-size-xl`: 24

### Font weights
- `--font-weight-regular`: 400
- `--font-weight-medium`: 500
- `--font-weight-semibold`: 600

---

## Spacing Tokens

- `--space-2`: 8
- `--space-3`: 12
- `--space-4`: 16
- `--space-5`: 20
- `--space-6`: 24
- `--space-8`: 32

---

## Border radius

- `--radius-sm`: 6
- `--radius-md`: 10
- `--radius-lg`: 14
