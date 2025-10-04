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

    const { selectedAnswer, correctAnswer, explanation } = await request.json()

    // Simple evaluation: check if selected answer matches correct answer
    const isCorrect = selectedAnswer === correctAnswer

    const evaluation = {
      correct: isCorrect,
      feedback: isCorrect
        ? `Correct! ${explanation}`
        : `Not quite. The correct answer is ${correctAnswer}. ${explanation}`,
    }

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
