// Express server for Plainly API
// Run: npm install && OPENAI_API_KEY=your_key node server.js

const express = require('express')
const multer = require('multer')
const OpenAI = require('openai')
const cors = require('cors')
require('dotenv').config()

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors())
app.use(express.json())

// Configure multer for file uploads (store in memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limit (OpenAI Whisper limit)
  },
})

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Plainly API is running' })
})

// Process recording endpoint
// Accepts audio file, transcribes with Whisper, generates both summary and structured transcript
app.post('/api/process-recording', upload.single('audio'), async (req, res) => {
  try {
    // Validate request
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' })
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OpenAI API key not configured' })
    }

    console.log(`Processing recording: size=${req.file.size} bytes`)

    // Step 1: Transcribe audio using Whisper
    console.log('Transcribing audio with Whisper...')

    let audioFile
    if (typeof File !== 'undefined') {
      audioFile = new File([req.file.buffer], req.file.originalname, {
        type: req.file.mimetype || 'audio/m4a',
      })
    } else {
      const { Readable } = require('stream')
      const stream = Readable.from(req.file.buffer)
      Object.defineProperty(stream, 'name', { value: req.file.originalname })
      Object.defineProperty(stream, 'type', { value: req.file.mimetype || 'audio/m4a' })
      audioFile = stream
    }

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'en',
      response_format: 'text',
    })

    const transcript = transcription

    if (!transcript || transcript.trim().length === 0) {
      return res.status(400).json({
        error: 'No speech detected in recording',
        transcript: '',
        summary: '',
        structuredTranscript: '',
      })
    }

    console.log(`Transcript length: ${transcript.length} characters`)

    // Step 2: Generate structured summary and structured transcript in parallel
    console.log('Generating summary and structured transcript...')

    const [summaryResult, structuredTranscriptResult] = await Promise.all([
      // Generate structured summary
      openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a precise summarisation engine. Given a raw transcript, produce a JSON object with this exact schema:

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
- Return ONLY valid JSON, no markdown or extra text`,
          },
          {
            role: 'user',
            content: `Here is the transcript:\n\n${transcript}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 1000,
        response_format: { type: 'json_object' },
      }),

      // Generate structured transcript
      openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a transcript structuring engine. Given a raw transcript, produce a JSON object with this exact schema:

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
- Return ONLY valid JSON, no markdown or extra text`,
          },
          {
            role: 'user',
            content: `Here is the transcript:\n\n${transcript}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      }),
    ])

    const summary = summaryResult.choices[0]?.message?.content || ''
    const structuredTranscript = structuredTranscriptResult.choices[0]?.message?.content || ''

    console.log('Successfully generated summary and structured transcript')

    return res.json({
      transcript,
      summary,
      structuredTranscript,
    })
  } catch (error) {
    console.error('Error processing recording:', error)

    if (error?.status === 401) {
      return res.status(401).json({
        error: 'Invalid API key. Please check your OpenAI API key.',
      })
    }

    if (error?.status === 429) {
      return res.status(429).json({
        error: 'Rate limit exceeded. Please try again later.',
      })
    }

    if (error?.code === 'ENOENT' || error?.message?.includes('File')) {
      return res.status(400).json({
        error: 'Invalid audio file format. Please ensure the file is a valid audio file.',
      })
    }

    return res.status(500).json({
      error: error?.message || 'Failed to process recording',
    })
  }
})

// Generate recording title endpoint
app.post('/api/generate-title', express.json(), async (req, res) => {
  try {
    const { transcript, summary } = req.body

    if (!transcript && !summary) {
      return res.status(400).json({ error: 'Either transcript or summary is required' })
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OpenAI API key not configured' })
    }

    const content = summary || transcript
    const truncatedContent = content.length > 1000 ? content.substring(0, 1000) + '...' : content

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Generate a short, human-friendly title (2-6 words) for this recording. Rules: No "Transcript of..." or "Summary of...". Avoid dates unless explicitly mentioned and important. If content is very short or unclear, return "Quick note". If multiple topics with no clear theme, return "Mixed notes". Return ONLY the title, nothing else.',
        },
        {
          role: 'user',
          content: `Content:\n\n${truncatedContent}\n\nGenerate a title:`,
        },
      ],
      temperature: 0.7,
      max_tokens: 20,
    })

    const title = completion.choices[0]?.message?.content?.trim() || 'Quick note'

    let cleanTitle = title.replace(/^["']|["']$/g, '').trim()
    if (cleanTitle.length > 50) {
      cleanTitle = cleanTitle.substring(0, 50).trim()
    }
    if (!cleanTitle || cleanTitle.length === 0) {
      cleanTitle = 'Quick note'
    }

    return res.json({ title: cleanTitle })
  } catch (error) {
    console.error('Error generating title:', error)
    return res.status(500).json({ error: error?.message || 'Failed to generate title' })
  }
})

// Start server
if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`Plainly API server running on port ${PORT}`)
    console.log(`Health check: http://localhost:${PORT}/health`)
    console.log(`Process endpoint: http://localhost:${PORT}/api/process-recording`)

    if (!process.env.OPENAI_API_KEY) {
      console.warn('WARNING: OPENAI_API_KEY not set!')
    }
  })

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`\nPort ${PORT} is already in use!`)
      console.error(`\nTo fix this, you can:`)
      console.error(`   1. Kill the process using port ${PORT}:`)
      console.error(`      lsof -ti:${PORT} | xargs kill -9`)
      console.error(`   2. Or use a different port by setting PORT in your .env file`)
      process.exit(1)
    } else {
      throw error
    }
  })
}

module.exports = app
