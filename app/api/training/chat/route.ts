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

    const { trainingId, messages, context } = parseRequest(await request.json())

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
      ...messages.map((msg) => ({
        role: msg.role,
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

    const aiMessage = completion.choices[0]?.message?.content ?? ''

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

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface ChatContext {
  trainingTitle?: string
  sop?: string
  keyPoints?: string[]
}

interface ChatRequestBody {
  trainingId: string
  messages: ChatMessage[]
  context: ChatContext
}

function parseRequest(body: unknown): ChatRequestBody {
  if (typeof body !== 'object' || body === null) {
    throw new Error('Invalid request body')
  }

  const record = body as Record<string, unknown>
  const trainingId = typeof record.trainingId === 'string' ? record.trainingId : ''
  const rawMessages = Array.isArray(record.messages) ? record.messages : []
  const contextRecord = typeof record.context === 'object' && record.context !== null
    ? record.context as Record<string, unknown>
    : {}

  if (!trainingId) {
    throw new Error('trainingId is required')
  }

  const messages: ChatMessage[] = rawMessages
    .map((msg, index) => sanitizeMessage(msg, index))
    .filter((msg): msg is ChatMessage => msg !== null)

  const context: ChatContext = {
    trainingTitle: typeof contextRecord.trainingTitle === 'string' ? contextRecord.trainingTitle : undefined,
    sop: typeof contextRecord.sop === 'string' ? contextRecord.sop : undefined,
    keyPoints: Array.isArray(contextRecord.keyPoints)
      ? contextRecord.keyPoints.filter((point): point is string => typeof point === 'string')
      : undefined,
  }

  return { trainingId, messages, context }
}

function sanitizeMessage(message: unknown, index: number): ChatMessage | null {
  if (typeof message !== 'object' || message === null) {
    console.warn(`Skipping invalid chat message at index ${index}`)
    return null
  }

  const record = message as Record<string, unknown>
  const role = record.role
  const content = record.content

  if ((role === 'user' || role === 'assistant') && typeof content === 'string') {
    return { role, content }
  }

  console.warn(`Skipping chat message at index ${index} due to missing role/content`)
  return null
}
