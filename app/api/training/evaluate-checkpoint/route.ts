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

    const { trainingId, chapterIndex, question, answer, context } = await request.json()

    // Build evaluation prompt
    const evaluationPrompt = `You are evaluating an employee's answer to a training checkpoint question.

Training Context:
SOP: ${context.sop || 'Not available'}
Key Points: ${context.keyPoints?.join(', ') || 'Not available'}

Question: ${question}
Employee's Answer: ${answer}

Evaluate the answer and respond with:
1. Whether it's correct (true/false)
2. Constructive feedback (be encouraging if correct, provide guidance if incorrect)

Respond in JSON format:
{
  "correct": boolean,
  "feedback": "your feedback here"
}

Be generous with partial credit. If the answer shows understanding, mark it correct.`

    // Get AI evaluation
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: evaluationPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    })

    const evaluation = JSON.parse(completion.choices[0].message.content || '{}')

    // Generate audio feedback with OpenAI TTS
    const mp3Response = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'nova',
      input: evaluation.feedback || 'Good job!',
      speed: 1.0,
    })

    // Convert audio to base64
    const audioBuffer = Buffer.from(await mp3Response.arrayBuffer())
    const audioBase64 = audioBuffer.toString('base64')

    return NextResponse.json({
      ...evaluation,
      audio: audioBase64,
    })
  } catch (error) {
    console.error('Checkpoint evaluation error:', error)
    return NextResponse.json(
      { error: 'Failed to evaluate checkpoint' },
      { status: 500 }
    )
  }
}
