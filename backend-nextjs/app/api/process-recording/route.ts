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
    'Clean up this transcript by removing filler words (um, uh, like, you know) when they appear repeatedly. Keep the meaning intact. If the content is very short or unclear, return it as-is with no changes.',

  summary:
    'Create a clear, concise summary of the main ideas discussed. Focus on key themes and the overall narrative. Be objective and factual. If the content is too brief or lacks a clear topic, return a short summary of whatever was said.',

  action_items:
    'Extract all tasks, decisions, and next steps mentioned. Format as a numbered list. Only include items explicitly stated as actions or decisions. If no action items are found, return exactly: "No action items detected in this recording."',

  key_points:
    'Extract the most important points and ideas as bullet points. Focus on distinct, meaningful insights. Remove redundancy. If the content is too brief to extract multiple points, return the single main point or state: "Recording too brief to extract key points."',
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

    if (!format || !['transcript', 'summary', 'action_items', 'key_points'].includes(format)) {
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

    // Step 2: If format is transcript, return it directly (cleaned version)
    if (format === 'transcript') {
      // For transcript format, still run through GPT for cleanup
      const cleanupCompletion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: formatPrompts.transcript },
          { role: 'user', content: processedTranscript },
        ],
        temperature: 0.2,
        max_tokens: 4000,
      })

      const cleanedTranscript = cleanupCompletion.choices[0]?.message?.content || processedTranscript

      return NextResponse.json({
        transcript: processedTranscript,
        output: cleanedTranscript.trim(),
      })
    }

    // Step 3: Generate structured output using GPT-4o-mini
    console.log(`Generating ${format} with GPT-4o-mini...`)
    const prompt = formatPrompts[format]

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: prompt,
        },
        {
          role: 'user',
          content: `Here is the transcript:\n\n${processedTranscript}\n\nGenerate the ${format.replace('_', ' ')} based on the instructions.`,
        },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    })

    const output = completion.choices[0]?.message?.content || ''

    // Handle empty outputs based on format
    if (!output || output.trim().length === 0) {
      const emptyMessages: Record<string, string> = {
        summary:
          'Unable to generate a summary. The recording may be too brief or unclear.',
        action_items:
          'No action items detected in this recording.',
        key_points:
          'Unable to extract key points. The recording may be too brief.',
      }
      return NextResponse.json({
        transcript: processedTranscript,
        output: emptyMessages[format] || 'Content could not be generated.',
      })
    }

    console.log(`Successfully generated ${format}`)

    return NextResponse.json({
      transcript: processedTranscript,
      output: output.trim(),
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
