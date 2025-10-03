import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()

    // Generate audio with OpenAI TTS
    const mp3Response = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'nova',
      input: text,
      speed: 1.0,
    })

    // Convert audio to base64
    const audioBuffer = Buffer.from(await mp3Response.arrayBuffer())
    const audioBase64 = audioBuffer.toString('base64')

    return NextResponse.json({ audio: audioBase64 })
  } catch (error) {
    console.error('Checkpoint intro TTS error:', error)
    return NextResponse.json(
      { error: 'Failed to generate audio' },
      { status: 500 }
    )
  }
}
