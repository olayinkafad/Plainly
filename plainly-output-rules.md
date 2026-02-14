# Plainly — Summary & Transcript Rules

These rules govern how Plainly generates summaries and formats transcripts. The summary is the interpretation. The transcript is the truth. Both are valuable. Neither replaces the other.

---

## Summary Structure

Every summary follows a three-layer structure. The layers are consistent across all recording types, but the tone and content adapt based on what was recorded.

### Layer 1 — The Gist (always present)

- 1–2 sentences, plain text, no formatting (no bold, no bullets)
- Written in the user's voice — casual, not formal
- Tells you what the recording was about and the main takeaway
- "You talked about weekend plans" not "The subject discussed various weekend activities"
- If the recording is a 10-second ramble, the gist is one short sentence

### Layer 2 — Key Points (always present)

- Bullet list
- Each bullet starts with a **bold lead-in** (the key concept), followed by supporting detail in regular weight
- The bold lead-ins are designed for scanning — read just the bold words and get 80% of the value
- Use the user's own words where possible, cleaned up for readability

Example:
- **Saturday plans** — staying in, cooking something new, maybe a film
- **Sunday plans** — try the new brunch place on 5th, call Mum
- **General vibe** — wants a chill, low-key weekend

### Layer 3 — Follow-ups (only when detected)

- Only appears when the AI detects action items, tasks, or things the user explicitly said they need to do
- If nothing actionable was mentioned, this section is omitted entirely
- Items use hollow circle markers (suggesting tasks, not just information)
- Only include items the user explicitly mentioned needing to do

Example:
- ○ Call Mum on Sunday
- ○ Look up the brunch place on 5th

---

## How Summaries Adapt by Recording Type

### Meeting Notes
- **Gist:** Summarises decisions made and purpose of the meeting
- **Key points:** What was discussed, grouped by topic. Bold lead-ins are the topics.
- **Follow-ups:** Who's doing what, with names if mentioned

### Personal Reflection / Journaling
- **Gist:** Captures the core feeling or thought
- **Key points:** Pulls out the insights, realisations, or themes
- **Follow-ups:** Usually omitted. Only included if the user said they want to do something.

### Quick Ideas / Brainstorms
- **Gist:** States the main idea in one line
- **Key points:** Breaks down the details, variations, or sub-ideas
- **Follow-ups:** Next steps if mentioned ("I should prototype this")

### To-do Dumps
- **Gist:** "Planning tasks for [context]."
- **Key points:** Each bullet is essentially a task
- **Follow-ups:** May merge with key points if every item is actionable

### Conversations
- **Gist:** What was discussed and with whom (if mentioned)
- **Key points:** Key moments, perspectives, or agreements
- **Follow-ups:** Anything that was agreed on or promised

---

## Summary Voice & Tone

- Write in the user's voice, not a formal AI voice
- Use the user's own words and phrases where possible, cleaned up for grammar and punctuation
- Keep it conversational — the summary should feel like a smart friend took notes for you
- Match the energy of the recording — a casual ramble gets a casual summary, a focused meeting gets a structured one

## Summary Length

- The summary should be proportional to the recording length
- 15-second recording = 1–2 sentence gist + 2–3 bullets maximum
- 5-minute recording = 1–2 sentence gist + 5–8 bullets + follow-ups if applicable
- 30-minute meeting = 1–2 sentence gist + 8–12 bullets grouped by topic + follow-ups
- Never pad a short recording with fluff to make the summary look longer

---

## Anti-Hallucination Rules

These are non-negotiable. A shorter accurate summary is always better than a longer one with invented details.

1. **Only include information explicitly stated in the transcript.** Do not infer, assume, or add details that weren't said.
2. **Preserve the user's specificity.** If they said "maybe cook something," write "maybe cook something" — not "planning to cook pasta" or "preparing a meal."
3. **Never invent names, dates, times, places, or numbers** that weren't in the transcript.
4. **Never add context the user didn't provide.** If they said "call Mum," don't expand it to "call Mum to check in on her health."
5. **Short recordings get short summaries.** A 10-second ramble should produce 1–2 lines, not a detailed breakdown.
6. **The gist should only summarise what was actually said,** never what the user "probably meant."
7. **Follow-ups only for explicit actions.** "I should probably call him" counts. Silence on a topic does not become a follow-up.
8. **When in doubt, leave it out.** Accuracy over comprehensiveness, always.
9. **Handle unclear recordings gracefully.** If the recording is too short or unclear to summarise meaningfully, return a simple gist like "Short recording — not enough to summarise." and skip key points and follow-ups entirely.

---

## Transcript Formatting Rules

### Philosophy

The transcript is a faithful record of exactly what the user said. It should never be restructured, reordered, or editorially altered. The only processing applied is punctuation, capitalisation, and paragraph breaks for readability.

### Paragraph Breaks

- Never show the entire transcript as a single block of text
- Break at natural pauses, topic shifts, or roughly every 3–4 sentences
- Short recordings (under 30 seconds) may only need 1–2 paragraphs
- Longer recordings should have more frequent breaks
- The goal is comfortable reading, not arbitrary chunking

### Filler Words

Filler words are displayed but visually dimmed. They are never removed.

**Filler word list:** um, uh, like, so, and, oh and, you know, I mean, okay so, right, basically, actually, literally, sort of, kind of, I guess, well, yeah

**Why keep them:**
- Removing filler words changes the meaning and rhythm of speech
- Users may want to hear exactly how they said something
- The transcript must match the audio — if a user plays the recording while reading, words should align
- Removing words would make the transcript feel edited, undermining trust

### Punctuation & Capitalisation

- Proper sentence capitalisation
- Full stops, commas, and question marks placed correctly
- Proper nouns capitalised where detected
- No words added, removed, or reordered — punctuation is the only editorial change
- If the user said "I was gonna go to the store," it stays as "I was gonna go to the store." It does not become "I was going to go to the store."

### Timestamps

- Recordings over 60 seconds: show timestamps at the start of each paragraph
- Recordings under 60 seconds: no timestamps
- Format: "0:00", "0:32", "1:05", "12:34"
- Tapping a timestamp seeks the audio player to that position

### What the Transcript Must Not Do

1. **No bold text.** Every word has equal visual weight (except dimmed fillers).
2. **No bullet points.** Flowing text in paragraphs only.
3. **No section headers.** No topic labels, no dividers.
4. **No reordering.** Words appear in the exact order they were spoken.
5. **No removal of words.** Even filler words, false starts, and self-corrections stay. They are dimmed, never deleted.
6. **No added words.** Punctuation can be inserted but no words or clarifications.
7. **No grammar correction beyond punctuation.** Spoken grammar stays as spoken.

---

## Example: Same Recording, Both Views

### As a Summary:

Design review for the new onboarding flow. Team agreed on the 3-screen approach and decided to drop the explainer screen.

- **Onboarding structure** — reduced from 4 screens to 3
- **Mic icon** — needs to be bigger, Sarah updating assets by Thursday
- **Colour palette** — switching to terracotta, team felt blue was too generic

Follow-ups:
- ○ Sarah to finalise illustration assets by Thursday
- ○ Dev to implement auto-switching on Screen 2

### As a Transcript:

0:00  Right, so the design review went well. Everyone's aligned on the three-screen onboarding approach. We're dropping the how-it-works explainer screen because it felt redundant.

0:28  The main feedback on screen one was that the mic icon needs to be bigger. Like it's the hero element but it doesn't feel prominent enough. Sarah's going to update the illustration assets by Thursday.

0:54  Um for screen two, we're going with the auto-switching between summary and transcript previews. I think that shows the value better than a static screenshot.

1:18  Oh and the colour palette — team preferred the terracotta over the current blue. It feels warmer, more human. I mean the blue just felt like every other tech app.
