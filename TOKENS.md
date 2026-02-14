# TOKENS.md — Plainly

This file defines the ONLY allowed design tokens.
Do not introduce new colors, spacing, or typography values.

Why:
Design consistency and visual calm depend on strict reuse.

---
Color Tokens
Background
--color-bg-primary: #FDFCFB
--color-bg-secondary: #F5F0EB
--color-bg-tertiary: #EDE7E0
Usage:
bg-primary bg-secondary bg-tertiary → Main screen backgrounds, cards, modals
→ Illustration areas, input fields, subtle sections
→ Hover states, pressed states, divider backgrounds
Text
--color-text-primary: #2C2826
--color-text-secondary: #7A7470
--color-text-tertiary: #A8A09A
--color-text-inverse: #FDFCFB
Usage:
text-primary text-secondary text-tertiary text-inverse → Headings, titles, body text, labels
→ Subtitles, descriptions, helper text, timestamps
→ Placeholders, disabled text, hint text
→ Text on accent-coloured backgrounds (buttons, badges)
Borders & Dividers
--color-border-default: #E0D8D0
--color-border-subtle: #EDE7E0
Usage:
border-default border-subtle → Card borders, input borders, divider lines
→ Section separators, very light structural lines
Accent
--color-accent-primary: #C45D3E
--color-accent-secondary: #D4714F
--color-accent-subtle: #F5E0D8
Usage:
accent-primary → Primary buttons, active tab fills, active pagination dot, key highlights, focus rings, mic
icon background, waveform bars, progress bars
accent-secondary → Hover/pressed state for primary buttons, secondary highlights, links on hover
accent-subtle subtle backgrounds, selected states
→ Light background tint for highlighted text in summaries, tag backgrounds, active tab
Never use accent colors for body text.
Status
--color-success: #4A8B5C
--color-success-subtle: #E8F2EA
--color-warning: #C4873E
--color-warning-subtle: #FBF0E0
--color-error: #BF4A3A
--color-error-subtle: #F9E5E3
Usage:
success → Save confirmations, success toasts, checkmarks (e.g. "Your recording is saved")
success-subtle → Background of success toasts/banners
warning → Warning messages, approaching limits
warning-subtle → Background of warning banners
error → Error messages, destructive actions, failed states
error-subtle → Background of error banners
Inactive / Disabled
--color-inactive: #C8C0B8
--color-disabled-bg: #F0EBE5
Usage:
inactive disabled-bg → Inactive tab text, inactive pagination dots, disabled icons
→ Disabled button backgrounds, inactive input backgrounds

---
## Typography Tokens

Use system fonts only.

### Font Sizes
--font-size-xs: 12
--font-size-sm: 14
--font-size-md: 16
--font-size-lg: 20
--font-size-xl: 24

### Font Weights
--font-weight-regular: 400
--font-weight-medium: 500
--font-weight-semibold: 600

Why:
A small type scale keeps hierarchy clear and readable.

---

## Spacing Tokens

--space-2: 8
--space-3: 12
--space-4: 16
--space-5: 20
--space-6: 24
--space-8: 32

Why:
Consistent spacing creates rhythm and visual trust.

---

## Border Radius

--radius-sm: 6
--radius-md: 10
--radius-lg: 14

Why:
Rounded corners should feel soft, not playful.