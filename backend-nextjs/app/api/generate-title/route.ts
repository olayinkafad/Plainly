// Next.js API Route for generating recording titles
// Uses GPT-4o-mini to generate a short, descriptive title based on content

import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { transcript, summary } = await request.json()

    if (!transcript && !summary) {
      return NextResponse.json(
        { title: 'Quick note' },
        { status: 200 }
      )
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { title: 'Recording' },
        { status: 200 }
      )
    }

    // Use summary if available, otherwise use first part of transcript
    const content = summary || (transcript?.substring(0, 500) || '')

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Generate a short, descriptive title (2-5 words) for this audio recording based on its content. Return only the title, nothing else. Do not use quotes around the title.',
        },
        {
          role: 'user',
          content: content,
        },
      ],
      temperature: 0.3,
      max_tokens: 20,
    })

    const title = completion.choices[0]?.message?.content?.trim() || 'Recording'

    return NextResponse.json({ title })
  } catch (error: any) {
    console.error('Error generating title:', error)
    // Return a fallback title instead of an error
    return NextResponse.json({ title: 'Recording' })
  }
}
