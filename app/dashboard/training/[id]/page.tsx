import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Clock, FileText, Video, ListChecks, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { DeleteTrainingButton } from '@/components/training/delete-training-button'
import { VideoPlayer } from '@/components/training/video-player'
import { AssignTrainingButton } from '@/components/training/assign-training-button'

export default async function TrainingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Fetch training
  const { data: training } = await supabase
    .from('training_modules')
    .select('*')
    .eq('id', id)
    .single()

  if (!training) {
    redirect('/dashboard')
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <DashboardLayout>
      <div className="p-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard">
            <Button variant="ghost" className="gap-2 mb-4">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>

          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">{training.title}</h1>
                <Badge variant={training.status === 'published' ? 'default' : 'secondary'}>
                  {training.status}
                </Badge>
              </div>
              {training.description && (
                <p className="text-gray-600 text-lg">{training.description}</p>
              )}
              <div className="flex items-center gap-6 mt-4 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {formatDuration(training.video_duration)}
                </span>
                <span className="flex items-center gap-1">
                  <Video className="h-4 w-4" />
                  {training.chapters?.length || 0} chapters
                </span>
                <span>Created {formatDate(training.created_at)}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <AssignTrainingButton trainingId={training.id} trainingTitle={training.title} />
              <DeleteTrainingButton trainingId={training.id} trainingTitle={training.title} />
            </div>
          </div>
        </div>

        {/* Video Player */}
        {training.mux_playback_id ? (
          <Card className="mb-6">
            <CardContent className="p-6">
              <VideoPlayer
                playbackId={training.mux_playback_id}
                title={training.title}
              />
            </CardContent>
          </Card>
        ) : training.video_url ? (
          <Card className="border-blue-200 bg-blue-50 mb-6">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Video className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-blue-900 mb-1">Video Processing</h4>
                  <p className="text-sm text-blue-800">
                    Your video is being processed for playback. This may take a few minutes.
                    Refresh the page to check if it's ready!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-blue-200 bg-blue-50 mb-6">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Video className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-blue-900 mb-1">Video Not Available</h4>
                  <p className="text-sm text-blue-800">
                    This training was created before video storage was enabled.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Content Tabs */}
        <Tabs defaultValue="sop" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="sop" className="gap-2">
              <FileText className="h-4 w-4" />
              SOP
            </TabsTrigger>
            <TabsTrigger value="chapters" className="gap-2">
              <Video className="h-4 w-4" />
              Chapters
            </TabsTrigger>
            <TabsTrigger value="transcript" className="gap-2">
              <ListChecks className="h-4 w-4" />
              Transcript
            </TabsTrigger>
          </TabsList>

          {/* SOP Tab */}
          <TabsContent value="sop" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Standard Operating Procedure</CardTitle>
                <CardDescription>
                  Step-by-step guide generated by AI
                </CardDescription>
              </CardHeader>
              <CardContent>
                {training.sop ? (
                  <div className="prose max-w-none">
                    <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                      {training.sop}
                    </pre>
                  </div>
                ) : (
                  <p className="text-gray-500">No SOP available</p>
                )}

                {training.key_points && training.key_points.length > 0 && (
                  <div className="mt-8">
                    <h3 className="font-semibold text-lg mb-4">Key Points</h3>
                    <div className="space-y-3">
                      {training.key_points.map((point, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                          <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-semibold flex-shrink-0">
                            {index + 1}
                          </div>
                          <p className="text-sm text-gray-700 flex-1">{point}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Chapters Tab */}
          <TabsContent value="chapters" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Video Chapters</CardTitle>
                <CardDescription>
                  Timeline markers for easy navigation
                </CardDescription>
              </CardHeader>
              <CardContent>
                {training.chapters && training.chapters.length > 0 ? (
                  <div className="space-y-2">
                    {training.chapters.map((chapter: any, index: number) => (
                      <div
                        key={index}
                        className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="text-sm font-mono text-gray-600 w-20">
                          {formatTime(chapter.start_time)}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{chapter.title}</h4>
                          <p className="text-xs text-gray-500">
                            Duration: {formatTime(chapter.end_time - chapter.start_time)}
                          </p>
                        </div>
                        <Badge variant="outline">Chapter {index + 1}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No chapters available</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Transcript Tab */}
          <TabsContent value="transcript" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Full Transcript</CardTitle>
                <CardDescription>
                  Complete speech-to-text transcription
                </CardDescription>
              </CardHeader>
              <CardContent>
                {training.transcript ? (
                  <div className="bg-gray-50 rounded-lg p-6">
                    <p className="text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">
                      {training.transcript}
                    </p>
                  </div>
                ) : (
                  <p className="text-gray-500">No transcript available</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
