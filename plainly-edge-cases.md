# Plainly — Edge Cases & Error States

All error and empty states should use Plainly's voice: warm, clear, honest. No jargon, no technical language, no blame.

---

## Result Screen — Empty States

### Summary can't be generated (transcript exists)

The recording was clear but too short or fragmented for a meaningful summary.

- **Heading:** "Too short to summarise"
- **Subtext:** "There wasn't enough here to pull out key points. Your full transcript is still available."
- **Link:** "View transcript" — tapping switches to the Transcript tab
- Styling: heading in Playfair Display 20px/700, subtext in Plus Jakarta Sans 15px/400 text-secondary, link in Plus Jakarta Sans 14px/600 accent-primary

### Transcript is unclear (summary exists)

Audio quality was poor but the AI could still extract enough meaning for a summary.

- **Heading:** "Hard to make out"
- **Subtext:** "The audio wasn't clear enough for a full transcript. We still pulled together a summary from what we could catch."
- **Link:** "View summary" — tapping switches to the Summary tab

### Both failed

Neither summary nor transcript could be generated. Recording was essentially noise, silence, or too short.

- **Heading:** "We couldn't make sense of this one"
- **Subtext:** "The recording was too short or unclear. You can still replay it."
- Both tabs show the same empty state
- The audio player still works so the user can listen back
- No redirect link since there's nowhere useful to send them

---

## Loading Screen — Error States

### Upload fails (no internet)

The recording can't be sent to the server.

- The active step "Sending your recording" stops its bouncing animation
- **Error message:** "No connection. Your recording is saved on your device."
- **Primary button:** "Try again" — accent-primary background, white text, pill shape
- **Secondary link:** "Go back" — text link, text-secondary colour. Returns to home screen.
- The recording should be saved locally and retried automatically when connection returns

### Processing fails midway

Upload succeeded but a later step (transcription, summarisation, or title generation) failed.

- The failed step shows a warning icon (small triangle, 20px, accent-primary colour) instead of bouncing dots
- **Step text changes to:** "Something went wrong"
- **Subtext:** "We saved your recording. We'll try processing it again."
- **Button:** "Go to recording" — takes user to the result screen with whatever was successfully processed (e.g., transcript exists but no summary)
- The app should auto-retry the failed step in the background

### Processing takes too long

Any single step exceeds expected duration.

**After 15 seconds on one step:**
- Subtle message appears below the active step: "Taking longer than usual..."
- Gentle fade-in, no alarm or urgency

**After 30 seconds on one step:**
- Message updates to: "Still working on it. You can wait or come back — we'll finish in the background."
- **Link:** "Go to home" — text link below the message
- If user leaves, the processing continues and the result appears on the home screen when ready

---

## Recording Screen — Error States

### Microphone interrupted

The microphone input stops unexpectedly during recording (Bluetooth disconnects, app backgrounded too long, hardware issue).

**Immediately:**
- Pause the timer and waveform animation
- Show inline alert below "I'm listening...": "Recording paused — microphone disconnected."
- Styling: Plus Jakarta Sans 14px/500, accent-primary colour

**If mic reconnects within 5 seconds:**
- The Pause button changes to "Resume"
- User can tap Resume to continue recording

**If mic doesn't reconnect within 5 seconds:**
- Message updates to: "Microphone lost. You can save what you have or try again."
- Bottom buttons change to:
  - "Save and finish" — accent-primary background, white text (processes whatever was recorded)
  - "Discard" — bg-tertiary background, text-primary text

### Recording too long

If the recording approaches the maximum duration or file size limit.

**At 90% of limit:**
- Subtle warning below the timer: "Recording will end soon"
- Styling: Plus Jakarta Sans 13px/400, text-tertiary colour

**At limit:**
- Recording stops automatically
- Brief toast: "Maximum length reached" — same style as other toasts
- Automatically transitions to the loading/processing screen as if the user tapped "Tap to complete"

---

## Home Screen — Edge States

### Recording stuck processing

A recording was saved but processing hasn't completed (user left during loading, or processing is happening in background).

- The recording card on the home screen shows a processing indicator
- Title: "Processing..." — Plus Jakarta Sans 16px/500, text-secondary colour (instead of the auto-generated title)
- Date and duration shown as normal
- No "Replay voice note" button (nothing to play yet — or show it if audio is available locally)
- Subtle pulsing dot animation (accent-primary, 6px) next to "Processing..." to indicate it's still working
- Tapping the card shows the result screen with whatever is available so far

### Recording failed to process

Processing was attempted but failed completely, and auto-retry also failed.

- The recording card shows an error state
- Title: shows auto-generated title if available, otherwise "Recording"
- Small warning icon (accent-primary) next to the date
- **Status text:** "Couldn't process — tap to retry" — Plus Jakarta Sans 13px/500, accent-primary colour, replaces the date/duration line
- Tapping the card retries processing

### No internet (global)

User opens the app with no internet connection.

- App works normally for browsing existing recordings and playing audio (if cached locally)
- If user taps the mic to record: recording works as normal, but after tapping "Tap to complete," the loading screen shows the upload error state
- No global banner or warning — only show the error when it actually blocks something

---

## Permission States

### Microphone permission denied

User previously denied microphone access (or revoked it in settings).

- When user taps the mic button, show a bottom sheet (Style 1):
  - **Heading:** "Microphone access needed"
  - **Subtext:** "Plainly needs your microphone to record. You can turn it on in Settings."
  - **Primary button:** "Open Settings" — accent-primary background, white text. Opens iOS Settings directly to the app's permission page.
  - **Secondary link:** "Not now" — text-secondary colour. Dismisses the sheet.

---

## General Principles for Error States

1. **Never blame the user.** "We couldn't make sense of this" not "Your recording was bad."
2. **Always preserve the recording.** Even if processing fails, the audio should be saved and replayable.
3. **Offer a next step.** Every error state has either a retry action, a redirect to something useful, or an explanation of what happens next.
4. **Match the severity to the tone.** No internet is calm and informational. Microphone lost is slightly more urgent. Neither is alarming.
5. **No technical jargon.** "No connection" not "Network request failed." "Hard to make out" not "Transcription confidence below threshold."
6. **Auto-recover when possible.** If internet returns, retry uploads automatically. If processing fails, retry in the background. Don't make the user manually fix things.
7. **Keep the audio player working.** Even in the worst case where everything fails, the user should be able to listen to their recording.
