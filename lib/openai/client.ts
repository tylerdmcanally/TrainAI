import OpenAI from 'openai'

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Helper function for transcription
export async function transcribeAudio(audioFile: File) {
  const transcription = await openai.audio.transcriptions.create({
    file: audioFile,
    model: 'whisper-1',
  })
  return transcription.text
}

// Helper function for generating SOP from transcript
export async function generateSOPFromTranscript(
  title: string,
  transcript: string
) {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are an expert training documentation specialist.
Convert this training video transcript into:

1. Chapter titles (every 2-3 minutes of content)
2. A clear, step-by-step SOP in markdown format
3. 5-7 key points employees must remember

Make it simple, actionable, and easy to follow.`,
      },
      {
        role: 'user',
        content: `Training Title: ${title}\n\nTranscript:\n${transcript}`,
      },
    ],
  })

  return completion.choices[0].message.content
}
