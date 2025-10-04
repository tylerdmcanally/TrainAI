import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { chapterTitle, context } = await request.json()

    // Build prompt for generating multiple choice question
    const prompt = `You are creating a multiple choice quiz question for a training checkpoint.

Training Context:
Chapter Title: ${chapterTitle}
SOP: ${context.sop || 'Not available'}
Key Points: ${context.keyPoints?.join(', ') || 'Not available'}
Transcript Excerpt: ${context.transcript?.substring(0, 500) || 'Not available'}

Create a multiple choice question about "${chapterTitle}" with:
1. A clear question that tests understanding of the key concepts
2. Four answer options (A, B, C, D)
3. One correct answer
4. Three plausible but incorrect answers

Respond in JSON format:
{
  "question": "Your question here",
  "options": [
    { "id": "A", "text": "First option" },
    { "id": "B", "text": "Second option" },
    { "id": "C", "text": "Third option" },
    { "id": "D", "text": "Fourth option" }
  ],
  "correctAnswer": "A",
  "explanation": "Brief explanation of why this is correct"
}

Make the question practical and relevant to real-world application.`

    // Get AI to generate question
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a helpful training quiz generator.' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    })

    const questionData = JSON.parse(completion.choices[0].message.content || '{}')

    return NextResponse.json(questionData)
  } catch (error) {
    console.error('Question generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate question' },
      { status: 500 }
    )
  }
}
