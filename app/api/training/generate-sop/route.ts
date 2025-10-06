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

    const rawContent = completion.choices[0]?.message?.content ?? '{}'
    const parsed = parseSOPResponse(rawContent, typeof duration === 'number' ? duration : 0)

    return NextResponse.json(parsed)
  } catch (error) {
    console.error('SOP generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate SOP' },
      { status: 500 }
    )
  }
}

interface ChapterResponse {
  title: string
  start_time: number
  end_time: number
  quiz_question?: string
}

interface SOPResponse {
  chapters: ChapterResponse[]
  sop: string
  keyPoints: string[]
}

function parseSOPResponse(content: string, duration: number): SOPResponse {
  let parsed: Record<string, unknown>

  try {
    parsed = JSON.parse(content) as Record<string, unknown>
  } catch (error) {
    console.error('Failed to parse SOP response JSON:', error)
    return { chapters: [], sop: '', keyPoints: [] }
  }

  const chapters = Array.isArray(parsed.chapters)
    ? parsed.chapters
        .map((chapter, index) => sanitizeChapter(chapter, index, duration))
        .filter((chapter): chapter is ChapterResponse => chapter !== null)
    : []

  if (chapters.length > 0 && duration > 0) {
    chapters[chapters.length - 1].end_time = duration
  }

  const sop = typeof parsed.sop === 'string' ? parsed.sop : ''
  const keyPoints = Array.isArray(parsed.keyPoints)
    ? parsed.keyPoints.filter((point): point is string => typeof point === 'string')
    : []

  return {
    chapters,
    sop,
    keyPoints,
  }
}

function sanitizeChapter(chapter: unknown, index: number, duration: number): ChapterResponse | null {
  if (typeof chapter !== 'object' || chapter === null) {
    console.warn(`Skipping invalid chapter at index ${index}`)
    return null
  }

  const record = chapter as Record<string, unknown>
  const title = typeof record.title === 'string' ? record.title : null
  const startRaw = typeof record.start_time === 'number' ? record.start_time : null
  const endRaw = typeof record.end_time === 'number' ? record.end_time : null
  const quizQuestion = typeof record.quiz_question === 'string' ? record.quiz_question : undefined

  if (title === null || startRaw === null || endRaw === null) {
    console.warn(`Skipping chapter at index ${index} due to missing fields`)
    return null
  }

  const start = clamp(startRaw, 0, duration)
  const end = clamp(endRaw, start, duration)

  return {
    title,
    start_time: start,
    end_time: end,
    ...(quizQuestion ? { quiz_question: quizQuestion } : {}),
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}
