# DESIGN_SYSTEM.md — Plainly

Plainly follows Apple Human Interface Guidelines as its primary design system.

Implementation is platform-native and mobile-first.

---

## Format Selection Behavior

Format selection is intentional and sequential.

Rules:
- Users select ONE format immediately after recording.
- The selected format is highlighted clearly.
- Only one format can be active at a time.
- Other formats are offered later as secondary actions.

Do NOT:
- Auto-generate all formats
- Show all outputs at once
- Force users to re-record to try another format

Why:
Plainly is a thinking tool, not an AI dump.
Intent-first interactions feel faster and more intelligent.

---

## Design Principles

- Calm over expressive
- Clarity over decoration
- Focus over density

Plainly is a thinking tool.
UI should never compete with content.

---

## Layout Rules

- Use generous whitespace
- Prefer vertical stacking
- Avoid visual clutter
- One primary action per screen

Why:
Users come to think, not navigate complexity.

---

## Typography Rules (Authoritative)

Plainly uses **Satoshi** as its primary typeface.

Rules:
- Default body text uses `Satoshi-Regular`
- Headings and primary titles use `Satoshi-Bold`
- Buttons and CTAs use `Satoshi-Medium`
- Metadata (date, duration, captions) use `Satoshi-Regular`
- Do NOT mix system fonts with Satoshi
- Avoid unnecessary text density
- Long-form text is allowed when it serves clarity

Hierarchy:
- Title → Satoshi-Bold
- Body → Satoshi-Regular
- Meta → Satoshi-Regular (smaller size)

Why:
Typography is the primary design element in Plainly.
A single, consistent typeface improves clarity, trust, and brand recognition.

---
## Iconography (Authoritative)

Plainly uses a single, consistent icon system.

Rules:
- Use custom icons from a defined icon set in the icons folder in assets folder.
- Do not mix multiple icon libraries.
- Icons must be simple, outline-based, and legible at small sizes.
- Icons should reinforce actions, not replace clear text labels.

Usage:
- Primary actions may include an icon + label.
- Secondary actions may use icon + label.
- Destructive actions must always include a text label.

Sizing:
- Default icon size: 24
- Secondary icon size: 20
- Small / utility icons: 16

Styling:
- Icon color must use text or accent tokens.
- Do not introduce custom colors for icons.
- Icon stroke weight should feel consistent across the app.

---

## Color Usage Rules

- UI is 90% neutral
- Accent color is used sparingly
- Borders are subtle and optional

If color does not add meaning, remove it.

---

## Component Rules

- Prefer native components
- Do not restyle system components heavily
- Avoid custom UI unless necessary

Why:
Native patterns feel faster, more trustworthy, and familiar.

---

## Accessibility (Non-Negotiable)

- Text contrast must meet WCAG AA
- Tap targets must be thumb-friendly
- Labels must be explicit

Why:
Clarity includes accessibility.