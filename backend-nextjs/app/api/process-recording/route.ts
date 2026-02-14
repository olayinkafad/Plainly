// Next.js API Route for processing audio recordings
// Handles: audio → transcript (Whisper) → structured outputs (GPT-4o-mini)

import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import https from 'https'

// Initialize OpenAI client (used for GPT, not Whisper due to node-fetch issues)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Constants
const MIN_AUDIO_SIZE_BYTES = 1000 // ~1KB minimum (very short recordings are likely noise)
const MAX_TRANSCRIPT_CHARS = 50000 // Truncate very long transcripts to avoid token limits
const MIN_TRANSCRIPT_LENGTH = 10 // Minimum transcript length to consider valid (prevents hallucination)
const HALLUCINATION_PATTERNS = [
  /^thank you for watching$/i,
  /^you$/i,
  /^thanks for watching$/i,
  /^subscribe$/i,
  /^like and subscribe$/i,
  /^\.$/,
  /^,$/,
  /^thank you$/i,
] // Common Whisper hallucination patterns

// Format-specific prompts
const formatPrompts: Record<string, string> = {
  transcript:
    'Transform this transcript into a structured JSON format. Rules: Do NOT add, remove, or reorder words. Do NOT invent speaker labels. Only label speakers if diarization is explicitly available. If diarization is not available, use a single speaker label "User" for all text. Preserve the original language and phrasing including filler words (um, uh, like, so, you know, I mean). Only clean up punctuation and capitalisation. Break into paragraph-sized segments at natural pauses, topic shifts, or roughly every 3-4 sentences — never put the entire transcript in one segment. Return ONLY valid JSON in this exact format: {"format":"transcript","language_detected":"string","speaker_separation":"provided"|"not_available","segments":[{"speaker":"string","text":"string","start":0}],"confidence_notes":{"possible_missed_words":boolean,"mixed_language_detected":boolean,"noisy_audio_suspected":boolean,"reason":"string|null"}}',

  summary:
    'You are a summary engine for voice recordings. Given a raw transcript, produce a JSON object with this exact schema: {"format":"summary","gist":"1-2 sentences capturing what this recording is about and the main takeaway","key_points":[{"lead":"Key concept","detail":"supporting detail using the user\'s own words"}],"follow_ups":["specific action item the user mentioned"],"confidence_notes":{"possible_missed_words":false,"mixed_language_detected":false,"noisy_audio_suspected":false,"reason":null}}. Rules: Detect recording type and adapt tone. The gist should be in the user\'s voice. key_points: 2-5 items, each with a lead (2-4 word key concept) and detail (supporting context). follow_ups: ONLY include if the user explicitly mentioned actions or tasks — omit the field entirely if none detected. Anti-hallucination: only include information explicitly stated. Never invent names, dates, places. If recording is too short or unclear, return gist "Short recording — not enough to summarize." with empty key_points. When in doubt, leave it out. Return ONLY valid JSON.',
}

// Custom Whisper transcription using native https (node-fetch has issues on Node 24)
async function transcribeAudio(audioBuffer: Buffer, filename: string, mimeType: string): Promise<{ text: string; segments?: Array<{ start: number; end: number; text: string }> }> {
  return new Promise((resolve, reject) => {
    const boundary = '----FormBoundary' + Math.random().toString(16).slice(2)

    const header = Buffer.from(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n` +
      `Content-Type: ${mimeType}\r\n\r\n`,
      'utf8'
    )

    const footer = Buffer.from(
      `\r\n--${boundary}\r\n` +
      `Content-Disposition: form-data; name="model"\r\n\r\n` +
      `whisper-1\r\n` +
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="language"\r\n\r\n` +
      `en\r\n` +
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="response_format"\r\n\r\n` +
      `verbose_json\r\n` +
      `--${boundary}--\r\n`,
      'utf8'
    )

    const fullBody = Buffer.concat([header, audioBuffer, footer])

    const req = https.request({
      hostname: 'api.openai.com',
      path: '/v1/audio/transcriptions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': fullBody.length,
      },
      timeout: 120000,
    }, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const json = JSON.parse(data)
            resolve({
              text: json.text || '',
              segments: json.segments || undefined,
            })
          } catch {
            resolve({ text: data, segments: undefined })
          }
        } else {
          console.error('Whisper API error:', res.statusCode, data)
          reject(new Error(`Whisper API error: ${res.statusCode} - ${data}`))
        }
      })
    })

    req.on('error', (err) => {
      console.error('Whisper request error:', err)
      reject(err)
    })

    req.on('timeout', () => {
      req.destroy()
      reject(new Error('Whisper request timed out'))
    })

    req.write(fullBody)
    req.end()
  })
}

// Generate structured transcript from raw text
async function generateStructuredTranscript(
  processedTranscript: string,
  whisperSegments?: Array<{ start: number; end: number; text: string }>
): Promise<any> {
  const languageDetected = 'en'

  let userMessage = `Here is the raw transcript:\n\n${processedTranscript}\n\n`
  if (whisperSegments && whisperSegments.length > 0) {
    userMessage += `Here are the timestamps from the audio:\n${JSON.stringify(whisperSegments.map((s: any) => ({ start: s.start, end: s.end, text: s.text })), null, 2)}\n\n`
  }
  userMessage += `Generate the structured transcript JSON with timestamps.`

  const structuredCompletion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: formatPrompts.transcript },
      { role: 'user', content: userMessage },
    ],
    temperature: 0.2,
    max_tokens: 4000,
    response_format: { type: 'json_object' },
  })

  let structuredTranscript
  try {
    const responseText = structuredCompletion.choices[0]?.message?.content || '{}'
    structuredTranscript = JSON.parse(responseText)

    if (!structuredTranscript.format) structuredTranscript.format = 'transcript'
    if (!structuredTranscript.language_detected) structuredTranscript.language_detected = languageDetected
    if (!structuredTranscript.speaker_separation) structuredTranscript.speaker_separation = 'not_available'
    if (!Array.isArray(structuredTranscript.segments)) {
      if (whisperSegments && whisperSegments.length > 0) {
        const firstSegment = whisperSegments[0]
        const lastSegment = whisperSegments[whisperSegments.length - 1]
        structuredTranscript.segments = [{
          speaker: 'User',
          text: processedTranscript,
          start: firstSegment.start || 0,
          end: lastSegment.end || 0,
        }]
      } else {
        structuredTranscript.segments = [{
          speaker: 'User',
          text: processedTranscript,
          start: 0,
          end: 0,
        }]
      }
    }

    if (Array.isArray(structuredTranscript.segments)) {
      structuredTranscript.segments = structuredTranscript.segments.filter(
        (seg: any) => seg && seg.text && seg.text.trim().length >= MIN_TRANSCRIPT_LENGTH
      )

      structuredTranscript.segments = structuredTranscript.segments.map((seg: any) => {
        if (typeof seg.start !== 'number' || typeof seg.end !== 'number') {
          if (whisperSegments && whisperSegments.length > 0) {
            const matchingSegment = whisperSegments.find((ws: any) =>
              ws.text && seg.text && ws.text.trim().includes(seg.text.trim().substring(0, 20))
            )
            if (matchingSegment) {
              return { ...seg, start: matchingSegment.start || 0, end: matchingSegment.end || 0 }
            }
          }
          return { ...seg, start: 0, end: 0 }
        }
        return seg
      })

      if (structuredTranscript.segments.length === 0) {
        // Fallback: single segment
        structuredTranscript.segments = [{
          speaker: 'User',
          text: processedTranscript,
          start: 0,
          end: 0,
        }]
      }
    }

    if (!structuredTranscript.confidence_notes) {
      structuredTranscript.confidence_notes = {
        possible_missed_words: false,
        mixed_language_detected: false,
        noisy_audio_suspected: false,
        reason: null,
      }
    }
  } catch (parseError) {
    console.error('Failed to parse structured transcript, using fallback:', parseError)
    let startTime = 0
    let endTime = 0
    if (whisperSegments && whisperSegments.length > 0) {
      startTime = whisperSegments[0].start || 0
      endTime = whisperSegments[whisperSegments.length - 1].end || 0
    }
    structuredTranscript = {
      format: 'transcript',
      language_detected: languageDetected,
      speaker_separation: 'not_available',
      segments: [{
        speaker: 'User',
        text: processedTranscript,
        start: startTime,
        end: endTime,
      }],
      confidence_notes: {
        possible_missed_words: false,
        mixed_language_detected: false,
        noisy_audio_suspected: false,
        reason: null,
      },
    }
  }

  return structuredTranscript
}

// Generate structured summary from raw text
async function generateStructuredSummary(processedTranscript: string): Promise<any> {
  const summaryCompletion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: formatPrompts.summary },
      {
        role: 'user',
        content: `Here is the transcript:\n\n${processedTranscript}\n\nGenerate the structured summary JSON.`,
      },
    ],
    temperature: 0.3,
    max_tokens: 2000,
    response_format: { type: 'json_object' },
  })

  let structuredSummary
  try {
    const responseText = summaryCompletion.choices[0]?.message?.content || '{}'
    structuredSummary = JSON.parse(responseText)

    if (!structuredSummary.format) structuredSummary.format = 'summary'
    if (!structuredSummary.gist) structuredSummary.gist = 'Summary unavailable'
    if (!Array.isArray(structuredSummary.key_points)) {
      structuredSummary.key_points = []
    }
    if (!structuredSummary.confidence_notes) {
      structuredSummary.confidence_notes = {
        possible_missed_words: false,
        mixed_language_detected: false,
        noisy_audio_suspected: false,
        reason: null,
      }
    }
    if (structuredSummary.gist.length > 300) {
      structuredSummary.gist = structuredSummary.gist.substring(0, 297) + '...'
    }
  } catch (parseError) {
    console.error('Failed to parse structured summary, using fallback:', parseError)
    structuredSummary = {
      format: 'summary',
      gist: 'Summary unavailable',
      key_points: [],
      confidence_notes: {
        possible_missed_words: false,
        mixed_language_detected: false,
        noisy_audio_suspected: false,
        reason: null,
      },
    }
  }

  return structuredSummary
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File
    const format = formData.get('format') as string | null

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      )
    }

    // Backward compat: validate format if provided
    if (format && !['transcript', 'summary'].includes(format)) {
      return NextResponse.json(
        { error: 'Invalid format specified' },
        { status: 400 }
      )
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    console.log(`Processing recording: format=${format || 'all'}, size=${audioFile.size} bytes, type=${audioFile.type}`)

    if (audioFile.size < MIN_AUDIO_SIZE_BYTES) {
      return NextResponse.json({
        transcript: '',
        output: 'Recording too short to process. Please record for at least a few seconds.',
      })
    }

    // Step 1: Transcribe audio using Whisper
    console.log('Transcribing audio with Whisper...')

    const arrayBuffer = await audioFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const filename = audioFile.name || 'recording.m4a'
    const mimeType = audioFile.type || 'audio/m4a'

    const transcriptionResult = await transcribeAudio(buffer, filename, mimeType)
    const transcript = transcriptionResult.text
    const whisperSegments = transcriptionResult.segments

    // Validate transcript
    if (!transcript || transcript.trim().length === 0) {
      return NextResponse.json(
        { error: 'No speech detected in recording', transcript: '', output: '' },
        { status: 400 }
      )
    }

    const trimmedTranscript = transcript.trim()

    if (trimmedTranscript.length < MIN_TRANSCRIPT_LENGTH) {
      console.log(`Transcript too short (${trimmedTranscript.length} chars), likely hallucination`)
      return NextResponse.json(
        { error: 'No speech detected in recording', transcript: '', output: '' },
        { status: 400 }
      )
    }

    const isHallucination = HALLUCINATION_PATTERNS.some(pattern => pattern.test(trimmedTranscript))
    if (isHallucination) {
      console.log(`Transcript matches hallucination pattern: "${trimmedTranscript}"`)
      return NextResponse.json(
        { error: 'No speech detected in recording', transcript: '', output: '' },
        { status: 400 }
      )
    }

    console.log(`Transcript length: ${trimmedTranscript.length} characters`)

    let processedTranscript = trimmedTranscript
    if (trimmedTranscript.length > MAX_TRANSCRIPT_CHARS) {
      console.log(`Truncating transcript from ${trimmedTranscript.length} to ${MAX_TRANSCRIPT_CHARS} characters`)
      processedTranscript = trimmedTranscript.substring(0, MAX_TRANSCRIPT_CHARS) + '... [truncated]'
    }

    if (!processedTranscript || processedTranscript.trim().length < MIN_TRANSCRIPT_LENGTH) {
      return NextResponse.json(
        { error: 'No speech detected in recording', transcript: '', output: '' },
        { status: 400 }
      )
    }

    // Step 2: Generate outputs

    // Dual-generation mode (no format param) — generate both summary and transcript in parallel
    if (!format) {
      console.log('Generating both summary and transcript in parallel...')

      const [structuredTranscript, structuredSummary] = await Promise.all([
        generateStructuredTranscript(processedTranscript, whisperSegments),
        generateStructuredSummary(processedTranscript),
      ])

      return NextResponse.json({
        transcript: processedTranscript,
        summary: JSON.stringify(structuredSummary),
        structuredTranscript: JSON.stringify(structuredTranscript),
      })
    }

    // Single-format mode (backward compat)
    if (format === 'transcript') {
      const structuredTranscript = await generateStructuredTranscript(processedTranscript, whisperSegments)
      return NextResponse.json({
        transcript: processedTranscript,
        output: JSON.stringify(structuredTranscript),
      })
    }

    if (format === 'summary') {
      const structuredSummary = await generateStructuredSummary(processedTranscript)
      return NextResponse.json({
        transcript: processedTranscript,
        output: JSON.stringify(structuredSummary),
      })
    }

    return NextResponse.json({
      transcript: processedTranscript,
      output: 'Format not yet implemented.',
    })
  } catch (error: any) {
    console.error('Error processing recording:', error)

    if (error?.status === 401) {
      return NextResponse.json(
        { error: 'Invalid API key. Please check your OpenAI API key.' },
        { status: 401 }
      )
    }

    if (error?.status === 429) {
      return NextResponse.json(
        { error: 'Rate limit exceeded or quota exceeded. Please check your OpenAI billing.' },
        { status: 429 }
      )
    }

    return NextResponse.json(
      { error: error?.message || 'Failed to process recording' },
      { status: 500 }
    )
  }
}
