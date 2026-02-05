# TOKENS.md — Plainly

This file defines the ONLY allowed design tokens.
Do not introduce new colors, spacing, or typography values.

Why:
Design consistency and visual calm depend on strict reuse.

---

## Color Tokens

### Background
--color-bg-primary: #FFFFFF
--color-bg-secondary: #F9FAFB

### Text
--color-text-primary: #111827
--color-text-secondary: #6B7280
--color-text-tertiary: #9CA3AF

### Borders & Dividers
--color-border-default: #E5E7EB
--color-border-subtle: #F1F5F9

### Accent
--color-accent-primary: #2563EB

Usage:
Accent color is ONLY for primary actions, focus states, and key highlights.
Never use accent color for body text.

### Status
--color-success: #16A34A
--color-warning: #D97706
--color-error: #DC2626

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