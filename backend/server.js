// Express server for Plainly API
// Run: npm install && OPENAI_API_KEY=your_key node server.js

const express = require('express')
const multer = require('multer')
const OpenAI = require('openai')
const cors = require('cors')
require('dotenv').config()

const app = express()
const PORT = process.env.PORT || 3000

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

// Format-specific prompts
const formatPrompts = {
  transcript:
    'Return the transcript exactly as transcribed, with minimal editing. Only remove obvious filler words like "um", "uh", "like" when they appear repeatedly. Preserve the original meaning and structure.',
  
  summary:
    'Create a clear, concise summary of the main ideas and topics discussed. Focus on the key themes and overall narrative. Be objective and factual.',
  
  action_items:
    'Extract all tasks, decisions, and next steps mentioned. Format as a numbered list. Only include items that are explicitly stated as actions or decisions. If no action items are found, return "No action items found."',
  
  key_points:
    'Extract the most important points and ideas. Format as bullet points. Focus on distinct, meaningful insights. Remove redundancy. If the content is too brief or lacks distinct points, return "Not enough distinct points to extract."',
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Plainly API is running' })
})

// Process recording endpoint
app.post('/api/process-recording', upload.single('audio'), async (req, res) => {
  try {
    // Validate request
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' })
    }

    const format = req.body.format
    if (!format || !['transcript', 'summary', 'action_items', 'key_points'].includes(format)) {
      return res.status(400).json({ error: 'Invalid format specified' })
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OpenAI API key not configured' })
    }

    console.log(`Processing recording: format=${format}, size=${req.file.size} bytes`)

    // Step 1: Transcribe audio using Whisper
    console.log('Transcribing audio with Whisper...')
    
    // Create a File object for OpenAI SDK
    // In Node.js 18+, File is available globally, but we'll handle both cases
    let audioFile
    if (typeof File !== 'undefined') {
      // Node.js 18+ or browser environment
      audioFile = new File([req.file.buffer], req.file.originalname, {
        type: req.file.mimetype || 'audio/m4a',
      })
    } else {
      // Fallback for older Node.js versions - create File-like object
      // OpenAI SDK accepts File objects or objects with name, stream, etc.
      const { Readable } = require('stream')
      const stream = Readable.from(req.file.buffer)
      // Add File-like properties
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
        output: '',
      })
    }

    console.log(`Transcript length: ${transcript.length} characters`)

    // Step 2: If format is transcript, return it directly
    if (format === 'transcript') {
      return res.json({
        transcript,
        output: transcript,
      })
    }

    // Step 3: Generate structured output using GPT
    console.log(`Generating ${format} with GPT...`)
    const prompt = formatPrompts[format]

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: prompt,
        },
        {
          role: 'user',
          content: `Here is the transcript:\n\n${transcript}\n\nGenerate the ${format} based on the instructions.`,
        },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    })

    const output = completion.choices[0]?.message?.content || ''

    // Handle empty outputs based on format
    if (!output || output.trim().length === 0) {
      const emptyMessages = {
        summary:
          "No clear summary detected. This recording didn't contain a clear topic or narrative to summarize.",
        action_items:
          'No action items found. Plainly didn\'t detect any tasks, decisions, or next steps in this recording.',
        key_points:
          'Not enough distinct points. This recording didn\'t contain multiple ideas to extract as key points.',
      }
      return res.json({
        transcript,
        output: emptyMessages[format] || 'Content could not be generated.',
      })
    }

    console.log(`Successfully generated ${format}`)

    return res.json({
      transcript,
      output: output.trim(),
    })
  } catch (error) {
    console.error('Error processing recording:', error)

    // Handle specific OpenAI errors
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

// Start server
if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`🚀 Plainly API server running on port ${PORT}`)
    console.log(`📡 Health check: http://localhost:${PORT}/health`)
    console.log(`🎤 Process endpoint: http://localhost:${PORT}/api/process-recording`)
    
    if (!process.env.OPENAI_API_KEY) {
      console.warn('⚠️  WARNING: OPENAI_API_KEY not set!')
    }
  })

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`\n❌ Port ${PORT} is already in use!`)
      console.error(`\n💡 To fix this, you can:`)
      console.error(`   1. Kill the process using port ${PORT}:`)
      console.error(`      lsof -ti:${PORT} | xargs kill -9`)
      console.error(`   2. Or use a different port by setting PORT in your .env file`)
      console.error(`\n   Finding what's using the port:`)
      console.error(`      lsof -i:${PORT}`)
      process.exit(1)
    } else {
      throw error
    }
  })
}

module.exports = app
