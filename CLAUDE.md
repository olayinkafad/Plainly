# CLAUDE.md — Plainly

## Source of Truth
- Technical stack is defined in TECH_STACK.md
- Design and interaction rules are defined in:
  - DESIGN_SYSTEM.md
  - TOKENS.md
  - MOTION.md

These files are authoritative.
Do not invent alternatives.

---

## Product Intent (Read First)

Plainly is a **mobile-first, audio-centric thinking tool**.

Plainly is NOT a transcription app.
Transcription is a technical step, not the product.

The product exists to:
- turn messy spoken thoughts into **clear, useful outputs**
- based on **explicit user intent**

When in doubt, optimize for:
clarity > speed > features > cleverness.

---

## Core User Principle

Plainly turns spoken thoughts into clear, useful outputs automatically.
After recording, both summary and transcript are generated together.

---

## Core User Flows (Authoritative)

There are only two ways to input audio:
1. Record audio in-app
2. Upload an existing recording

Both paths MUST converge immediately after audio input.
Do not create parallel logic after this point.

## First-time user flow:

Onboarding CTA → Recording screen

After finishing recording → Processing animation (both formats generated) → Result screen

Then → Home

Returning users:

App opens on Home

---

## Output Formats (Authoritative)

Plainly supports exactly two formats:

- summary
- transcript

Rules:
- Both formats are generated automatically after recording
- The backend runs both GPT calls in parallel for speed
- The result screen shows both formats as switchable tabs
- Default view is summary

---

## Generation Model (Critical)

The product follows a single-step model:

1. User records or uploads audio
2. User taps "Tap to complete"
3. Processing animation plays while both formats are generated in parallel
4. Result screen shows summary and transcript as switchable tabs

Switching formats:
- Switches tab in place
- Does not navigate away
- Does not reset scroll position

---

## AI Architecture (Non-negotiable)

AI is split into two distinct steps:
1. Speech → raw transcript
2. Raw transcript → structured output

Rules:
- Never combine these steps
- Never hallucinate content
- If intent cannot be fulfilled, return an explicit empty / not-detected state

Failing safely is better than being “helpful”.

---

## Prompting Rules

- Do not add new information
- Preserve original meaning
- Remove filler words
- Be concise and structured
- If unsure, say so explicitly

---

## Library & Detail Model

A recording is a **single source of truth** with multiple representations.

Rules:
- Home shows recordings (source)
- Detail screen shows formats (views)
- Never mix formats into the Home list
- Long recordings must be readable and navigable

---

## Decision Heuristic

If a change:
- makes output clearer → do it
- adds configuration or choice → question it


Clarity is the product.

---

## What NOT to Build (Unless Explicitly Asked)

- User accounts
- Cloud sync
- Search, folders, or advanced organization
- Collaboration features
- Payments or subscriptions

Why:
Momentum and clarity matter more than completeness.

---

## Implementation Discipline

- Prefer simple, boring solutions
- Avoid abstraction unless reused twice
- Explicit > clever

When unsure, choose the solution that is easiest to explain in a demo.