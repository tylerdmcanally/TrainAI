// app/api/jobs/process/route.ts
// Background job processor - processes pending jobs

import { NextRequest, NextResponse } from 'next/server'
import { backgroundJobService } from '@/lib/services/background-jobs'
import { withApiErrorHandler } from '@/lib/utils/api-error-handler'
import { openai } from '@/lib/openai/client'
import { createAdminClient } from '@/lib/supabase/admin'

// This endpoint processes background jobs
// Should be called by a cron job or scheduled task
export const POST = withApiErrorHandler(async (request: NextRequest) => {
  const adminSupabase = createAdminClient()
  
  // Verify this is being called by an authorized service
  const authHeader = request.headers.get('authorization')
  const expectedToken = process.env.BACKGROUND_JOB_TOKEN
  
  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const { jobTypes = ['transcription', 'sop_generation', 'mux_upload', 'tts_generation'] } = await request.json()

  const processedJobs: string[] = []
  const errors: string[] = []

  try {
    // Get pending jobs
    const pendingJobs = await backgroundJobService.getPendingJobs(20)

    for (const job of pendingJobs) {
      try {
        // Mark job as processing
        await backgroundJobService.updateJob(job.id, {
          status: 'processing',
          progressPercentage: 0,
          progressMessage: 'Starting processing...'
        })

        let result: Record<string, unknown>

        switch (job.job_type) {
          case 'transcription':
            result = await processTranscriptionJob(job)
            break
          case 'sop_generation':
            result = await processSOPGenerationJob(job)
            break
          case 'mux_upload':
            result = await processMuxUploadJob(job)
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
        
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        errors.push(`${job.id}: ${errorMessage}`)

        // Check if we should retry
        if (job.retry_count < job.max_retries) {
          await backgroundJobService.scheduleRetry(job.id, 5) // Retry in 5 minutes
        } else {
          await backgroundJobService.failJob(job.id, error instanceof Error ? error : new Error(errorMessage))
        }
      }
    }

    return NextResponse.json({
      message: 'Job processing completed',
      processedCount: processedJobs.length,
      processedJobs,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error) {
    console.error('Job processing failed:', error)
    throw error
  }
})

// Process transcription job
async function processTranscriptionJob(job: any) {
  const { audioFileUrl } = job.input_data

  await backgroundJobService.updateProgress(job.id, 25, 'Downloading audio file...')

  // Download audio file (in a real implementation, you'd download from Supabase storage)
  // For now, we'll assume the file is accessible
  const audioFile = new File([], 'audio.webm') // Placeholder

  await backgroundJobService.updateProgress(job.id, 50, 'Transcribing with OpenAI Whisper...')

  // Transcribe with OpenAI Whisper
  const transcription = await openai.audio.transcriptions.create({
    file: audioFile,
    model: 'whisper-1',
    response_format: 'text'
  })

  await backgroundJobService.updateProgress(job.id, 75, 'Processing transcript...')

  const transcript = transcription

  await backgroundJobService.updateProgress(job.id, 100, 'Transcription complete')

  return { transcript }
}

// Process SOP generation job
async function processSOPGenerationJob(job: any) {
  const { title, transcript, duration } = job.input_data

  await backgroundJobService.updateProgress(job.id, 20, 'Generating chapters...')

  // Generate SOP with GPT-4
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
- Chapters should align with natural topic breaks in the content`
      },
      {
        role: 'user',
        content: `Training Title: ${title}
Video Duration: ${duration} seconds
Transcript:
${transcript}

Create chapters that fit within the ${duration} second video duration.`
      }
    ],
    response_format: { type: 'json_object' }
  })

  await backgroundJobService.updateProgress(job.id, 80, 'Processing AI response...')

  const result = JSON.parse(completion.choices[0].message.content || '{}')

  // Validate and cap chapter times to video duration
  if (result.chapters && Array.isArray(result.chapters)) {
    result.chapters = result.chapters.map((chapter: any) => ({
      ...chapter,
      end_time: Math.min(chapter.end_time, duration)
    }))
  }

  await backgroundJobService.updateProgress(job.id, 100, 'SOP generation complete')

  return {
    chapters: result.chapters || [],
    sop: result.sop || '',
    keyPoints: result.keyPoints || []
  }
}

// Process Mux upload job
async function processMuxUploadJob(job: any) {
  const { videoUrl } = job.input_data

  await backgroundJobService.updateProgress(job.id, 30, 'Uploading to Mux...')

  // In a real implementation, you would:
  // 1. Download the video from Supabase storage
  // 2. Upload to Mux
  // 3. Wait for processing
  // 4. Return playback ID and asset ID

  // For now, return placeholder data
  const playbackId = `playback_${Date.now()}`
  const assetId = `asset_${Date.now()}`

  await backgroundJobService.updateProgress(job.id, 100, 'Mux upload complete')

  return {
    playbackId,
    assetId,
    status: 'ready'
  }
}

// Process TTS generation job
async function processTTSGenerationJob(job: any) {
  const { text } = job.input_data

  await backgroundJobService.updateProgress(job.id, 50, 'Generating audio...')

  // Generate TTS audio
  const response = await openai.audio.speech.create({
    model: 'tts-1',
    voice: 'alloy',
    input: text
  })

  const audioBuffer = await response.arrayBuffer()
  const audioBase64 = Buffer.from(audioBuffer).toString('base64')

  await backgroundJobService.updateProgress(job.id, 100, 'TTS generation complete')

  return {
    audioData: audioBase64,
    format: 'mp3'
  }
}

// Process checkpoint evaluation job
async function processCheckpointEvaluationJob(job: any) {
  const { question, answer, transcript } = job.input_data

  await backgroundJobService.updateProgress(job.id, 50, 'Evaluating answer...')

  // Evaluate with GPT-4
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

Provide evaluation and feedback.`
      }
    ]
  })

  const evaluation = completion.choices[0].message.content

  await backgroundJobService.updateProgress(job.id, 100, 'Evaluation complete')

  return { evaluation }
}
