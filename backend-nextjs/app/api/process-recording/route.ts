// Next.js API Route for processing audio recordings
// Handles: audio → transcript (Whisper) → structured output (GPT-4o-mini)

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

// Format-specific prompts - designed to handle edge cases gracefully
const formatPrompts: Record<string, string> = {
  transcript:
    'Transform this transcript into a structured JSON format. Rules: Do NOT add or remove meaning. Do NOT invent speaker labels. Only label speakers if diarization is explicitly available. If diarization is not available, use a single speaker label "User" for all text. Preserve the original language and phrasing. Break into short segments (1-3 sentences each). Only remove obvious filler words (um, uh, like, you know) if they do not change meaning (be conservative). Return ONLY valid JSON in this exact format: {"format":"transcript","language_detected":"string","speaker_separation":"provided"|"not_available","segments":[{"speaker":"string","text":"string"}],"confidence_notes":{"possible_missed_words":boolean,"mixed_language_detected":boolean,"noisy_audio_suspected":boolean,"reason":"string|null"}}',

  summary:
    'Transform this transcript into a structured summary JSON. Rules: Do NOT invent facts, names, dates, or decisions. If something is unclear or ambiguous, omit it rather than guessing. Preserve the language of the recording. Return ONLY valid JSON in this exact format: {"format":"summary","language_detected":"string","one_line":"string (max 140 chars)","key_takeaways":["string"],"context":"string|null","confidence_notes":{"possible_missed_words":boolean,"mixed_language_detected":boolean,"noisy_audio_suspected":boolean,"reason":"string|null"}}. one_line: a single clear sentence (max 140 characters). key_takeaways: 3-6 short bullets, each focused on one idea. context: only include if it genuinely adds clarity; otherwise null. confidence_notes.reason: short, human explanation only if one of the booleans is true.',

  action_items:
    'Extract all tasks, decisions, and next steps mentioned. Rules: Only include tasks that are explicitly stated or clearly implied. Do NOT invent owners, deadlines, or responsibilities. If a task exists but details are missing, mark missing fields as "unclear" or null. If no actions exist, set none_found=true and items=[]. Return ONLY valid JSON in this exact format: {"format":"action_items","language_detected":"string","none_found":boolean,"items":[{"task":"string","owner":"string|\\"unclear\\"|null","due":"string|\\"unclear\\"|null","details":"string|null"}],"confidence_notes":{"possible_missed_words":boolean,"mixed_language_detected":boolean,"noisy_audio_suspected":boolean,"reason":"string|null"}}. task must be verb-first (e.g. "Draft intro", "Follow up with recruiter"). owner: null unless explicitly mentioned. due: keep literal language ("tomorrow", "next week") if present.',
}

// Custom Whisper transcription using native https (node-fetch has issues on Node 24)
async function transcribeAudio(audioBuffer: Buffer, filename: string, mimeType: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const boundary = '----FormBoundary' + Math.random().toString(16).slice(2)

    // Build multipart form data
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
      timeout: 120000, // 2 minute timeout
    }, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const json = JSON.parse(data)
            resolve(json.text || '')
          } catch {
            resolve(data) // If not JSON, return as-is
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

export async function POST(request: NextRequest) {
  try {
    // Get form data
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File
    const format = formData.get('format') as string

    // Validate request
    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      )
    }

    if (!format || !['transcript', 'summary', 'action_items'].includes(format)) {
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

    console.log(`Processing recording: format=${format}, size=${audioFile.size} bytes, type=${audioFile.type}`)

    // Edge case: Very small audio files (likely empty or noise)
    if (audioFile.size < MIN_AUDIO_SIZE_BYTES) {
      return NextResponse.json({
        transcript: '',
        output: 'Recording too short to process. Please record for at least a few seconds.',
      })
    }

    // Step 1: Transcribe audio using Whisper (native https)
    console.log('Transcribing audio with Whisper...')

    const arrayBuffer = await audioFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const filename = audioFile.name || 'recording.m4a'
    const mimeType = audioFile.type || 'audio/m4a'

    const transcript = await transcribeAudio(buffer, filename, mimeType)

    if (!transcript || transcript.trim().length === 0) {
      return NextResponse.json(
        {
          error: 'No speech detected in recording',
          transcript: '',
          output: '',
        },
        { status: 400 }
      )
    }

    console.log(`Transcript length: ${transcript.length} characters`)

    // Edge case: Truncate very long transcripts to avoid token limits
    let processedTranscript = transcript
    if (transcript.length > MAX_TRANSCRIPT_CHARS) {
      console.log(`Truncating transcript from ${transcript.length} to ${MAX_TRANSCRIPT_CHARS} characters`)
      processedTranscript = transcript.substring(0, MAX_TRANSCRIPT_CHARS) + '... [truncated]'
    }

    // Step 2: If format is transcript, generate structured JSON
    if (format === 'transcript') {
      // Detect language from transcript (simple heuristic: check for common non-English patterns)
      // For now, default to English; can be enhanced with language detection API
      const languageDetected = 'en' // TODO: Add proper language detection if needed

      // Generate structured transcript
      const structuredCompletion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: formatPrompts.transcript },
          { role: 'user', content: `Here is the raw transcript:\n\n${processedTranscript}\n\nGenerate the structured transcript JSON.` },
        ],
        temperature: 0.2,
        max_tokens: 4000,
        response_format: { type: 'json_object' },
      })

      let structuredTranscript
      try {
        const responseText = structuredCompletion.choices[0]?.message?.content || '{}'
        structuredTranscript = JSON.parse(responseText)
        
        // Validate and set defaults
        if (!structuredTranscript.format) structuredTranscript.format = 'transcript'
        if (!structuredTranscript.language_detected) structuredTranscript.language_detected = languageDetected
        if (!structuredTranscript.speaker_separation) structuredTranscript.speaker_separation = 'not_available'
        if (!Array.isArray(structuredTranscript.segments)) {
          // Fallback: create single segment with all text
          structuredTranscript.segments = [{ speaker: 'User', text: processedTranscript }]
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
        // Fallback: create basic structured format
        console.error('Failed to parse structured transcript, using fallback:', parseError)
        structuredTranscript = {
          format: 'transcript',
          language_detected: languageDetected,
          speaker_separation: 'not_available',
          segments: [{ speaker: 'User', text: processedTranscript }],
          confidence_notes: {
            possible_missed_words: false,
            mixed_language_detected: false,
            noisy_audio_suspected: false,
            reason: null,
          },
        }
      }

      return NextResponse.json({
        transcript: processedTranscript,
        output: JSON.stringify(structuredTranscript),
      })
    }

    // Step 3: Generate structured output using GPT-4o-mini
    console.log(`Generating ${format} with GPT-4o-mini...`)
    const prompt = formatPrompts[format]

    // For summary format, generate structured JSON
    if (format === 'summary') {
      const summaryCompletion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: prompt,
          },
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
        
        // Validate and set defaults
        if (!structuredSummary.format) structuredSummary.format = 'summary'
        if (!structuredSummary.language_detected) structuredSummary.language_detected = 'en'
        if (!structuredSummary.one_line) structuredSummary.one_line = 'Summary unavailable'
        if (!Array.isArray(structuredSummary.key_takeaways)) {
          structuredSummary.key_takeaways = []
        }
        if (structuredSummary.context === undefined) structuredSummary.context = null
        if (!structuredSummary.confidence_notes) {
          structuredSummary.confidence_notes = {
            possible_missed_words: false,
            mixed_language_detected: false,
            noisy_audio_suspected: false,
            reason: null,
          }
        }
        // Ensure one_line is max 140 chars
        if (structuredSummary.one_line.length > 140) {
          structuredSummary.one_line = structuredSummary.one_line.substring(0, 137) + '...'
        }
      } catch (parseError) {
        // Fallback: create basic structured format
        console.error('Failed to parse structured summary, using fallback:', parseError)
        structuredSummary = {
          format: 'summary',
          language_detected: 'en',
          one_line: 'Summary unavailable',
          key_takeaways: [],
          context: null,
          confidence_notes: {
            possible_missed_words: false,
            mixed_language_detected: false,
            noisy_audio_suspected: false,
            reason: null,
          },
        }
      }

      return NextResponse.json({
        transcript: processedTranscript,
        output: JSON.stringify(structuredSummary),
      })
    }

    // For action_items format, generate structured JSON
    if (format === 'action_items') {
      const actionItemsCompletion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: prompt,
          },
          {
            role: 'user',
            content: `Here is the transcript:\n\n${processedTranscript}\n\nGenerate the structured action items JSON.`,
          },
        ],
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      })

      let structuredActionItems
      try {
        const responseText = actionItemsCompletion.choices[0]?.message?.content || '{}'
        structuredActionItems = JSON.parse(responseText)
        
        // Validate and set defaults
        if (!structuredActionItems.format) structuredActionItems.format = 'action_items'
        if (!structuredActionItems.language_detected) structuredActionItems.language_detected = 'en'
        if (structuredActionItems.none_found === undefined) {
          structuredActionItems.none_found = !Array.isArray(structuredActionItems.items) || structuredActionItems.items.length === 0
        }
        if (!Array.isArray(structuredActionItems.items)) {
          structuredActionItems.items = []
          structuredActionItems.none_found = true
        }
        // Ensure each item has required fields
        structuredActionItems.items = structuredActionItems.items.map((item: any) => ({
          task: item.task || '',
          owner: item.owner ?? null,
          due: item.due ?? null,
          details: item.details ?? null,
        }))
        if (!structuredActionItems.confidence_notes) {
          structuredActionItems.confidence_notes = {
            possible_missed_words: false,
            mixed_language_detected: false,
            noisy_audio_suspected: false,
            reason: null,
          }
        }
      } catch (parseError) {
        // Fallback: create empty action items structure
        console.error('Failed to parse structured action items, using fallback:', parseError)
        structuredActionItems = {
          format: 'action_items',
          language_detected: 'en',
          none_found: true,
          items: [],
          confidence_notes: {
            possible_missed_words: false,
            mixed_language_detected: false,
            noisy_audio_suspected: false,
            reason: null,
          },
        }
      }

      return NextResponse.json({
        transcript: processedTranscript,
        output: JSON.stringify(structuredActionItems),
      })
    }

    // For other formats, use existing logic (currently none, but keeping for future)
    return NextResponse.json({
      transcript: processedTranscript,
      output: 'Format not yet implemented.',
    })
  } catch (error: any) {
    console.error('Error processing recording:', error)

    // Handle specific OpenAI errors
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
