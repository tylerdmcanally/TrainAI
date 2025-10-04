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

    const { trainingId, messages, context } = await request.json()

    // Build system prompt with training context
    const systemPrompt = `You are an AI tutor helping an employee learn from a training video. Your role is to:
1. Answer questions about the training content
2. Quiz the employee to check understanding
3. Provide encouragement and feedback
4. Explain concepts in simple terms

Training Context:
Title: ${context.trainingTitle || 'Training'}

Standard Operating Procedure:
${context.sop || 'Not available'}

Key Points:
${context.keyPoints?.map((point: string, i: number) => `${i + 1}. ${point}`).join('\n') || 'Not available'}

Be friendly, encouraging, and concise. When quizzing, ask one question at a time and provide feedback on answers.`

    // Convert messages to OpenAI format
    const openAIMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...messages.map((msg: any) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
    ]

    // Get AI response
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: openAIMessages,
      temperature: 0.7,
      max_tokens: 500,
    })

    const aiMessage = completion.choices[0].message.content

    // Generate audio with OpenAI TTS
    const mp3Response = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'nova', // Options: alloy, echo, fable, onyx, nova, shimmer
      input: aiMessage || '',
      speed: 1.0,
    })

    // Convert audio to base64
    const audioBuffer = Buffer.from(await mp3Response.arrayBuffer())
    const audioBase64 = audioBuffer.toString('base64')

    // Save chat message to database
    // First get the assignment ID
    const { data: assignment } = await supabase
      .from('assignments')
      .select('id')
      .eq('module_id', trainingId)
      .eq('employee_id', user.id)
      .single()

    if (assignment) {
      await supabase.from('chat_messages').insert({
        assignment_id: assignment.id,
        role: 'assistant',
        content: aiMessage,
      })
    }

    return NextResponse.json({
      message: aiMessage,
      audio: audioBase64,
    })
  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json(
      { error: 'Failed to process chat' },
      { status: 500 }
    )
  }
}
