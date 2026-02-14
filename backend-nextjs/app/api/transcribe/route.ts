// Next.js API Route: /api/transcribe
// Stage 1: audio → raw transcript (Whisper)

import { NextRequest, NextResponse } from 'next/server'
import https from 'https'

const MIN_AUDIO_SIZE_BYTES = 1000
const MIN_TRANSCRIPT_LENGTH = 10
const HALLUCINATION_PATTERNS = [
  /^thank you for watching$/i,
  /^you$/i,
  /^thanks for watching$/i,
  /^subscribe$/i,
  /^like and subscribe$/i,
  /^\.$/,
  /^,$/,
  /^thank you$/i,
]

function whisperTranscribe(audioBuffer: Buffer, filename: string, mimeType: string): Promise<string> {
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
      `text\r\n` +
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
          resolve(data.trim())
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
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 })
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
    }

    if (audioFile.size < MIN_AUDIO_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'Recording too short to process.', transcript: '' },
        { status: 400 }
      )
    }

    console.log(`[transcribe] size=${audioFile.size} bytes, type=${audioFile.type}`)

    const arrayBuffer = await audioFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const filename = audioFile.name || 'recording.m4a'
    const mimeType = audioFile.type || 'audio/m4a'

    const transcript = await whisperTranscribe(buffer, filename, mimeType)

    if (!transcript || transcript.trim().length === 0) {
      return NextResponse.json(
        { error: 'No speech detected in recording', transcript: '' },
        { status: 400 }
      )
    }

    const trimmed = transcript.trim()

    if (trimmed.length < MIN_TRANSCRIPT_LENGTH) {
      return NextResponse.json(
        { error: 'No speech detected in recording', transcript: '' },
        { status: 400 }
      )
    }

    if (HALLUCINATION_PATTERNS.some(p => p.test(trimmed))) {
      return NextResponse.json(
        { error: 'No speech detected in recording', transcript: '' },
        { status: 400 }
      )
    }

    console.log(`[transcribe] transcript length: ${trimmed.length} chars`)
    return NextResponse.json({ transcript: trimmed })
  } catch (error: any) {
    console.error('[transcribe] error:', error)

    if (error?.status === 401) {
      return NextResponse.json({ error: 'Invalid API key.' }, { status: 401 })
    }
    if (error?.status === 429) {
      return NextResponse.json({ error: 'Rate limit exceeded.' }, { status: 429 })
    }

    return NextResponse.json(
      { error: error?.message || 'Failed to transcribe recording' },
      { status: 500 }
    )
  }
}
