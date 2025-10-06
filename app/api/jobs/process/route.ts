// app/api/jobs/process/route.ts
// Background job processor - processes pending jobs

import { NextRequest, NextResponse } from 'next/server'
import Mux from '@mux/mux-node'

import { backgroundJobService } from '@/lib/services/background-jobs'
import type { BackgroundJob } from '@/lib/services/background-jobs'
import { withApiErrorHandler } from '@/lib/utils/api-error-handler'
import { openai } from '@/lib/openai/client'
import { createAdminClient } from '@/lib/supabase/admin'

type AdminClient = ReturnType<typeof createAdminClient>
type JobResult = Record<string, unknown>
type SanitizedChapter = {
  title: string
  start_time: number
  end_time: number
  quiz_question?: string
}

const defaultJobTypes = [
  'transcription',
  'sop_generation',
  'mux_upload',
  'tts_generation',
  'checkpoint_evaluation',
] as const

const muxTokenId = process.env.MUX_TOKEN_ID
const muxTokenSecret = process.env.MUX_TOKEN_SECRET

const muxClient = muxTokenId && muxTokenSecret
  ? new Mux({ tokenId: muxTokenId, tokenSecret: muxTokenSecret })
  : null

// This endpoint processes background jobs
// Should be called by a cron job or scheduled task
export const POST = withApiErrorHandler(async (request: NextRequest) => {
  const authHeader = request.headers.get('authorization')
  const expectedToken = process.env.BACKGROUND_JOB_TOKEN

  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const adminSupabase = createAdminClient()
  const requestedJobTypes = await resolveRequestedJobTypes(request)

  const processedJobs: string[] = []
  const errors: string[] = []

  // Get pending jobs
  const pendingJobs = await backgroundJobService.getPendingJobs(20)

  for (const job of pendingJobs) {
    if (!requestedJobTypes.has(job.job_type)) {
      continue
    }

    try {
      // Mark job as processing
      await backgroundJobService.updateJob(job.id, {
        status: 'processing',
        progressPercentage: 0,
        progressMessage: 'Starting processing...'
      })

      let result: JobResult

      switch (job.job_type) {
        case 'transcription':
          result = await processTranscriptionJob(job, adminSupabase)
          break
        case 'sop_generation':
          result = await processSOPGenerationJob(job, adminSupabase)
          break
        case 'mux_upload':
          result = await processMuxUploadJob(job, adminSupabase)
          break
        case 'tts_generation':
          result = await processTTSGenerationJob(job)
          break
        case 'checkpoint_evaluation':
          result = await processCheckpointEvaluationJob(job)
          break
        default:
          throw new Error(`Unknown job type: ${job.job_type}`)
      }

      // Mark job as completed
      await backgroundJobService.completeJob(job.id, result)
      processedJobs.push(job.id)
    } catch (error) {
      console.error(`Failed to process job ${job.id}:`, error)

      const message = error instanceof Error ? error.message : 'Unknown error'
      errors.push(`${job.id}: ${message}`)

      // Check if we should retry
      if (job.retry_count < job.max_retries) {
        await backgroundJobService.scheduleRetry(job.id, 5) // Retry in 5 minutes
      } else {
        const failureError = error instanceof Error ? error : new Error(message)
        await backgroundJobService.failJob(job.id, failureError)
      }
    }
  }

  return NextResponse.json({
    message: 'Job processing completed',
    processedCount: processedJobs.length,
    processedJobs,
    errors: errors.length > 0 ? errors : undefined,
  })
})

async function processTranscriptionJob(
  job: BackgroundJob,
  adminSupabase: AdminClient
): Promise<JobResult> {
  const input = toInputRecord(job.input_data)
  const audioFileUrl = assertString(input.audioFileUrl, 'audioFileUrl')

  await backgroundJobService.updateProgress(job.id, 25, 'Downloading audio file...')

  const audioResponse = await fetch(audioFileUrl)
  if (!audioResponse.ok) {
    throw new Error(`Failed to download audio file: ${audioResponse.status}`)
  }

  const audioBuffer = await audioResponse.arrayBuffer()
  const contentType = audioResponse.headers.get('content-type') || 'audio/webm'
  const extension = contentType.split('/')[1] || 'webm'
  const audioFile = new File([audioBuffer], `audio-${job.id}.${extension}`, {
    type: contentType,
  })

  await backgroundJobService.updateProgress(job.id, 50, 'Transcribing with OpenAI Whisper...')

  const transcriptionResponse = await openai.audio.transcriptions.create({
    file: audioFile,
    model: 'whisper-1',
    response_format: 'text'
  })

  const transcriptText = normalizeTranscription(transcriptionResponse)
  if (!transcriptText) {
    throw new Error('Transcription result was empty')
  }

  await backgroundJobService.updateProgress(job.id, 100, 'Transcription complete')

  if (job.training_module_id) {
    const { error } = await adminSupabase
      .from('training_modules')
      .update({ transcript: transcriptText })
      .eq('id', job.training_module_id)

    if (error) {
      throw new Error(`Failed to update training module transcript: ${error.message}`)
    }
  }

  return { transcript: transcriptText }
}

async function processSOPGenerationJob(
  job: BackgroundJob,
  adminSupabase: AdminClient
): Promise<JobResult> {
  const input = toInputRecord(job.input_data)
  const title = assertString(input.title, 'title')
  const transcript = assertString(input.transcript, 'transcript')
  const duration = assertNumber(input.duration, 'duration')

  await backgroundJobService.updateProgress(job.id, 20, 'Generating chapters...')

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

  await backgroundJobService.updateProgress(job.id, 80, 'Processing AI response...')

  const content = completion.choices[0]?.message?.content ?? null
  const sopResult = parseSOPContent(content, duration)

  await backgroundJobService.updateProgress(job.id, 100, 'SOP generation complete')

  if (job.training_module_id) {
    const { error } = await adminSupabase
      .from('training_modules')
      .update({
        chapters: sopResult.chapters,
        sop: sopResult.sop,
        key_points: sopResult.keyPoints,
      })
      .eq('id', job.training_module_id)

    if (error) {
      throw new Error(`Failed to update training module SOP details: ${error.message}`)
    }
  }

  return sopResult
}

async function processMuxUploadJob(
  job: BackgroundJob,
  adminSupabase: AdminClient
): Promise<JobResult> {
  const input = toInputRecord(job.input_data)
  const videoUrl = assertString(input.videoUrl, 'videoUrl')

  await backgroundJobService.updateProgress(job.id, 30, 'Uploading to Mux...')

  if (!muxClient) {
    throw new Error('Mux credentials are not configured')
  }

  const asset = await muxClient.video.assets.create({
    input: videoUrl,
    playback_policy: ['public'],
  })

  await backgroundJobService.updateProgress(job.id, 60, 'Waiting for Mux asset to become ready...')

  let currentAsset = asset
  const maxAttempts = 20
  let attempts = 0

  while (currentAsset.status !== 'ready' && currentAsset.status !== 'errored' && attempts < maxAttempts) {
    await sleep(5000)
    currentAsset = await muxClient.video.assets.retrieve(asset.id)
    attempts += 1
  }

  if (currentAsset.status === 'errored') {
    throw new Error(`Mux asset processing failed for asset ${currentAsset.id}`)
  }

  if (currentAsset.status !== 'ready') {
    throw new Error('Mux asset processing timed out')
  }

  const playbackId = currentAsset.playback_ids?.[0]?.id
  if (!playbackId) {
    throw new Error('Mux playback ID not available')
  }

  if (job.training_module_id) {
    const { error } = await adminSupabase
      .from('training_modules')
      .update({
        mux_playback_id: playbackId,
        mux_asset_id: currentAsset.id,
      })
      .eq('id', job.training_module_id)

    if (error) {
      throw new Error(`Failed to update training module Mux metadata: ${error.message}`)
    }
  }

  await backgroundJobService.updateProgress(job.id, 100, 'Mux upload complete')

  return {
    playbackId,
    assetId: currentAsset.id,
    status: currentAsset.status,
  }
}

async function processTTSGenerationJob(job: BackgroundJob): Promise<JobResult> {
  const input = toInputRecord(job.input_data)
  const text = assertString(input.text, 'text')

  await backgroundJobService.updateProgress(job.id, 50, 'Generating audio...')

  const response = await openai.audio.speech.create({
    model: 'tts-1',
    voice: 'alloy',
    input: text,
  })

  const audioBuffer = await response.arrayBuffer()
  const audioBase64 = Buffer.from(audioBuffer).toString('base64')

  await backgroundJobService.updateProgress(job.id, 100, 'TTS generation complete')

  return {
    audioData: audioBase64,
    format: 'mp3',
  }
}

async function processCheckpointEvaluationJob(job: BackgroundJob): Promise<JobResult> {
  const input = toInputRecord(job.input_data)
  const question = assertString(input.question, 'question')
  const answer = assertString(input.answer, 'answer')
  const transcript = assertString(input.transcript, 'transcript')

  await backgroundJobService.updateProgress(job.id, 50, 'Evaluating answer...')

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are an expert training evaluator. Evaluate the employee\'s answer and provide constructive feedback.'
      },
      {
        role: 'user',
        content: `Question: ${question}
Employee Answer: ${answer}
Training Context: ${transcript}

Provide evaluation and feedback.`,
      },
    ],
  })

  const evaluation = completion.choices[0]?.message?.content ?? ''

  await backgroundJobService.updateProgress(job.id, 100, 'Evaluation complete')

  return { evaluation }
}

async function resolveRequestedJobTypes(request: NextRequest): Promise<Set<string>> {
  try {
    const body = await request.json() as Record<string, unknown>
    const jobTypes = Array.isArray(body?.jobTypes) ? body.jobTypes.filter((value): value is string => typeof value === 'string') : []

    if (jobTypes.length > 0) {
      return new Set(jobTypes)
    }
  } catch {
    // Ignore parse errors and fall back to defaults
  }

  return new Set(defaultJobTypes)
}

function toInputRecord(inputData: BackgroundJob['input_data']): Record<string, unknown> {
  return (inputData ?? {}) as Record<string, unknown>
}

function assertString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Expected a non-empty string for "${field}"`)
  }
  return value
}

function assertNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new Error(`Expected a numeric value for "${field}"`)
  }
  return value
}

function parseSOPContent(content: string | null, duration: number) {
  if (!content) {
    throw new Error('AI response did not include SOP content')
  }

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(content) as Record<string, unknown>
  } catch (error) {
    throw new Error(`Failed to parse SOP response as JSON: ${(error as Error).message}`)
  }

  const chaptersRaw = Array.isArray(parsed.chapters) ? parsed.chapters : []
  const chapters = chaptersRaw
    .map((chapterValue, index) => sanitizeChapter(chapterValue, index, duration))
    .filter((chapter): chapter is SanitizedChapter => chapter !== null)

  if (chapters.length > 0) {
    chapters[chapters.length - 1].end_time = duration
  }

  const sop = typeof parsed.sop === 'string' ? parsed.sop : ''
  const keyPointsRaw = Array.isArray(parsed.keyPoints) ? parsed.keyPoints : []
  const keyPoints = keyPointsRaw.filter((point): point is string => typeof point === 'string' && point.trim().length > 0)

  return {
    chapters,
    sop,
    keyPoints,
  }
}

function sanitizeChapter(chapterValue: unknown, index: number, duration: number): SanitizedChapter | null {
  if (!isRecord(chapterValue)) {
    console.warn(`Skipping invalid chapter at index ${index}`)
    return null
  }

  try {
    const title = assertString(chapterValue.title, `chapters[${index}].title`)
    const start = clamp(assertNumber(chapterValue.start_time, `chapters[${index}].start_time`), 0, duration)
    const end = clamp(assertNumber(chapterValue.end_time, `chapters[${index}].end_time`), start, duration)
    const quizQuestion = typeof chapterValue.quiz_question === 'string' && chapterValue.quiz_question.trim().length > 0
      ? chapterValue.quiz_question
      : undefined

    return {
      title,
      start_time: start,
      end_time: end,
      ...(quizQuestion ? { quiz_question: quizQuestion } : {}),
    }
  } catch (error) {
    console.warn(`Skipping chapter at index ${index}: ${(error as Error).message}`)
    return null
  }
}

function normalizeTranscription(response: unknown): string {
  if (typeof response === 'string') {
    return response.trim()
  }

  if (isRecord(response) && typeof response.text === 'string') {
    return response.text.trim()
  }

  return ''
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
