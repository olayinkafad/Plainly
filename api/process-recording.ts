// Serverless function for processing recordings
// Deploy this to Vercel, Netlify, or AWS Lambda
// 
// Setup:
// 1. Install dependencies: npm install openai form-data
// 2. Set OPENAI_API_KEY environment variable
// 3. Deploy to your serverless platform

import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Format-specific prompts
const formatPrompts: Record<string, string> = {
  transcript: 'Return the transcript exactly as transcribed, with minimal editing. Only remove obvious filler words like "um", "uh", "like" when they appear repeatedly. Preserve the original meaning and structure.',
  
  summary: 'Create a clear, concise summary of the main ideas and topics discussed. Focus on the key themes and overall narrative. Be objective and factual.',
  
  action_items: 'Extract all tasks, decisions, and next steps mentioned. Format as a numbered list. Only include items that are explicitly stated as actions or decisions. If no action items are found, return "No action items found."',
  
  key_points: 'Extract the most important points and ideas. Format as bullet points. Focus on distinct, meaningful insights. Remove redundancy. If the content is too brief or lacks distinct points, return "Not enough distinct points to extract."',
}

export async function POST(request: NextRequest) {
  try {
    // Get form data
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File
    const format = formData.get('format') as string

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

    // Step 1: Transcribe audio using Whisper
    console.log('Transcribing audio...')
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'en', // Optional: auto-detect if not specified
      response_format: 'text',
    })

    const transcript = transcription as unknown as string

    if (!transcript || transcript.trim().length === 0) {
      return NextResponse.json(
        { error: 'No speech detected in recording' },
        { status: 400 }
      )
    }

    // Step 2: If format is transcript, return it directly
    if (format === 'transcript') {
      return NextResponse.json({
        transcript,
        output: transcript,
      })
    }

    // Step 3: Generate structured output using GPT
    console.log(`Generating ${format}...`)
    const prompt = formatPrompts[format]
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo', // Use gpt-4 for better quality if needed
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
      temperature: 0.3, // Lower temperature for more consistent, factual outputs
      max_tokens: 1000, // Adjust based on expected output length
    })

    const output = completion.choices[0]?.message?.content || ''

    // Handle empty outputs based on format
    if (!output || output.trim().length === 0) {
      const emptyMessages: Record<string, string> = {
        summary: 'No clear summary detected. This recording didn\'t contain a clear topic or narrative to summarize.',
        action_items: 'No action items found. Plainly didn\'t detect any tasks, decisions, or next steps in this recording.',
        key_points: 'Not enough distinct points. This recording didn\'t contain multiple ideas to extract as key points.',
      }
      return NextResponse.json({
        transcript,
        output: emptyMessages[format] || 'Content could not be generated.',
      })
    }

    return NextResponse.json({
      transcript,
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
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      )
    }

    return NextResponse.json(
      { error: error?.message || 'Failed to process recording' },
      { status: 500 }
    )
  }
}

// For Vercel serverless functions, export as default
export default POST
