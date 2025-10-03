import { NextRequest, NextResponse } from 'next/server'
import { openai } from '@/lib/openai/client'

export async function POST(request: NextRequest) {
  try {
    const { title, transcript, duration } = await request.json()

    if (!title || !transcript) {
      return NextResponse.json(
        { error: 'Title and transcript are required' },
        { status: 400 }
      )
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an expert training documentation specialist.
Convert this training video transcript into:

1. Chapter titles (break the video into logical sections based on topic changes)
2. A clear, step-by-step SOP in markdown format with headers, bullet points, and numbered steps
3. 5-7 key points employees must remember

Format your response as JSON with this structure:
{
  "chapters": [
    {
      "title": "Chapter Title",
      "start_time": 0,
      "end_time": 60,
      "quiz_question": "A specific question to test understanding of THIS chapter's content"
    }
  ],
  "sop": "Markdown formatted SOP content",
  "keyPoints": ["Key point 1", "Key point 2", ...]
}

IMPORTANT:
- Chapter end_time values MUST NOT exceed the video duration
- The last chapter's end_time should equal the video duration
- Create 2-4 chapters for short videos (under 3 minutes)
- Chapters should align with natural topic breaks in the content`,
        },
        {
          role: 'user',
          content: `Training Title: ${title}
Video Duration: ${duration} seconds
Transcript:
${transcript}

Create chapters that fit within the ${duration} second video duration.`,
        },
      ],
      response_format: { type: 'json_object' },
    })

    const result = JSON.parse(completion.choices[0].message.content || '{}')

    // Validate and cap chapter times to video duration
    if (result.chapters && duration) {
      result.chapters = result.chapters.map((chapter: any) => ({
        ...chapter,
        start_time: Math.min(chapter.start_time, duration),
        end_time: Math.min(chapter.end_time, duration),
      }))
    }

    return NextResponse.json({
      chapters: result.chapters || [],
      sop: result.sop || '',
      keyPoints: result.keyPoints || [],
    })
  } catch (error) {
    console.error('SOP generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate SOP' },
      { status: 500 }
    )
  }
}
