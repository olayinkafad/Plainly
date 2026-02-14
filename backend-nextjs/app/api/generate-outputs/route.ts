// Next.js API Route: /api/generate-outputs
// Stage 2: raw transcript → summary + structured transcript (GPT-4o-mini)

import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const MAX_TRANSCRIPT_CHARS = 50000

const SUMMARY_PROMPT = `You are a precise summarisation engine. Given a raw transcript, produce a JSON object with this exact schema:

{
  "format": "summary",
  "one_line": "A single sentence capturing the core idea (max 120 chars)",
  "key_takeaways": ["takeaway 1", "takeaway 2", "takeaway 3"],
  "context": "Optional sentence about setting/participants, or null",
  "confidence_notes": {
    "possible_missed_words": false,
    "mixed_language_detected": false,
    "noisy_audio_suspected": false,
    "reason": null
  }
}

Rules:
- Do not add new information
- Preserve original meaning
- Remove filler words
- Be concise and structured
- If unsure, say so explicitly in confidence_notes
- key_takeaways should have 2-5 items
- Return ONLY valid JSON, no markdown or extra text`

const TRANSCRIPT_PROMPT = `You are a transcript structuring engine. Given a raw transcript, produce a JSON object with this exact schema:

{
  "format": "transcript",
  "segments": [
    {
      "speaker": "Speaker",
      "text": "The spoken text for this segment",
      "start": 0
    }
  ],
  "speaker_separation": "not_provided",
  "confidence_notes": {
    "possible_missed_words": false,
    "mixed_language_detected": false,
    "noisy_audio_suspected": false,
    "reason": null
  }
}

Rules:
- Break the transcript into logical segments (by topic shift or natural pause points)
- Keep segment text faithful to the original — do NOT remove filler words
- speaker_separation should be "provided" only if you can clearly identify multiple speakers, otherwise "not_provided"
- If speaker_separation is "not_provided", use "Speaker" for all segments
- start times should increment (use 0 for first segment, estimate reasonable intervals)
- Return ONLY valid JSON, no markdown or extra text`

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { transcript } = body

    if (!transcript || !transcript.trim()) {
      return NextResponse.json({ error: 'No transcript provided' }, { status: 400 })
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
    }

    let processedTranscript = transcript.trim()
    if (processedTranscript.length > MAX_TRANSCRIPT_CHARS) {
      processedTranscript = processedTranscript.substring(0, MAX_TRANSCRIPT_CHARS) + '... [truncated]'
    }

    console.log('[generate-outputs] generating summary and structured transcript...')

    const [summaryResult, transcriptResult] = await Promise.all([
      openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SUMMARY_PROMPT },
          { role: 'user', content: `Here is the transcript:\n\n${processedTranscript}` },
        ],
        temperature: 0.3,
        max_tokens: 1000,
        response_format: { type: 'json_object' },
      }),

      openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: TRANSCRIPT_PROMPT },
          { role: 'user', content: `Here is the transcript:\n\n${processedTranscript}` },
        ],
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      }),
    ])

    const summary = summaryResult.choices[0]?.message?.content || ''
    const structuredTranscript = transcriptResult.choices[0]?.message?.content || ''

    console.log('[generate-outputs] done')

    return NextResponse.json({ summary, structuredTranscript })
  } catch (error: any) {
    console.error('[generate-outputs] error:', error)

    if (error?.status === 401) {
      return NextResponse.json({ error: 'Invalid API key.' }, { status: 401 })
    }
    if (error?.status === 429) {
      return NextResponse.json({ error: 'Rate limit exceeded.' }, { status: 429 })
    }

    return NextResponse.json(
      { error: error?.message || 'Failed to generate outputs' },
      { status: 500 }
    )
  }
}
