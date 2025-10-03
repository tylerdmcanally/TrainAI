'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TrainingData } from '@/app/dashboard/training/create/page'
import { ArrowRight, ArrowLeft, FileText, Video, ListChecks, Edit2, X, Plus } from 'lucide-react'

interface ReviewStepProps {
  data: TrainingData
  onUpdate: (updates: Partial<TrainingData>) => void
  onNext: () => void
  onBack: () => void
}

export function ReviewStep({ data, onUpdate, onNext, onBack }: ReviewStepProps) {
  const [editingChapter, setEditingChapter] = useState<number | null>(null)
  const [editingKeyPoint, setEditingKeyPoint] = useState<number | null>(null)
  const [newKeyPoint, setNewKeyPoint] = useState('')

  const updateChapterTitle = (index: number, newTitle: string) => {
    const updatedChapters = [...(data.chapters || [])]
    updatedChapters[index] = { ...updatedChapters[index], title: newTitle }
    onUpdate({ chapters: updatedChapters })
  }

  const updateKeyPoint = (index: number, newValue: string) => {
    const updatedKeyPoints = [...(data.keyPoints || [])]
    updatedKeyPoints[index] = newValue
    onUpdate({ keyPoints: updatedKeyPoints })
  }

  const removeKeyPoint = (index: number) => {
    const updatedKeyPoints = [...(data.keyPoints || [])]
    updatedKeyPoints.splice(index, 1)
    onUpdate({ keyPoints: updatedKeyPoints })
  }

  const addKeyPoint = () => {
    if (newKeyPoint.trim()) {
      onUpdate({ keyPoints: [...(data.keyPoints || []), newKeyPoint.trim()] })
      setNewKeyPoint('')
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Review & Edit</CardTitle>
        <CardDescription>
          Review the AI-generated content and make any edits before publishing.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
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
            <TabsTrigger value="keypoints" className="gap-2">
              <ListChecks className="h-4 w-4" />
              Key Points
            </TabsTrigger>
          </TabsList>

          {/* SOP Tab */}
          <TabsContent value="sop" className="space-y-4 mt-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">
                  Standard Operating Procedure
                </label>
                <Button variant="ghost" size="sm" className="gap-1">
                  <Edit2 className="h-3 w-3" />
                  Edit
                </Button>
              </div>
              <div className="border rounded-lg p-4 bg-gray-50 max-h-96 overflow-y-auto">
                <textarea
                  value={data.sop || ''}
                  onChange={(e) => onUpdate({ sop: e.target.value })}
                  className="w-full min-h-[300px] bg-transparent border-none focus:outline-none resize-none font-mono text-sm"
                  placeholder="Your SOP content will appear here..."
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Markdown formatting is supported (# headers, **bold**, - lists, etc.)
              </p>
            </div>
          </TabsContent>

          {/* Chapters Tab */}
          <TabsContent value="chapters" className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Video Chapters ({data.chapters?.length || 0})
              </label>
              <div className="space-y-2">
                {data.chapters?.map((chapter, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 border rounded-lg bg-gray-50">
                    <div className="text-sm font-mono text-gray-600 w-20">
                      {formatTime(chapter.start_time)}
                    </div>
                    {editingChapter === index ? (
                      <Input
                        value={chapter.title}
                        onChange={(e) => updateChapterTitle(index, e.target.value)}
                        onBlur={() => setEditingChapter(null)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') setEditingChapter(null)
                        }}
                        autoFocus
                        className="flex-1"
                      />
                    ) : (
                      <div
                        className="flex-1 cursor-pointer hover:text-blue-600"
                        onClick={() => setEditingChapter(index)}
                      >
                        {chapter.title}
                      </div>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingChapter(index)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Key Points Tab */}
          <TabsContent value="keypoints" className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Key Takeaways ({data.keyPoints?.length || 0})
              </label>
              <div className="space-y-2 mb-4">
                {data.keyPoints?.map((point, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 border rounded-lg bg-gray-50">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-semibold flex-shrink-0 mt-0.5">
                      {index + 1}
                    </div>
                    {editingKeyPoint === index ? (
                      <Input
                        value={point}
                        onChange={(e) => updateKeyPoint(index, e.target.value)}
                        onBlur={() => setEditingKeyPoint(null)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') setEditingKeyPoint(null)
                        }}
                        autoFocus
                        className="flex-1"
                      />
                    ) : (
                      <div
                        className="flex-1 cursor-pointer hover:text-blue-600"
                        onClick={() => setEditingKeyPoint(index)}
                      >
                        {point}
                      </div>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingKeyPoint(index)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeKeyPoint(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Add new key point */}
              <div className="flex gap-2">
                <Input
                  placeholder="Add a new key point..."
                  value={newKeyPoint}
                  onChange={(e) => setNewKeyPoint(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addKeyPoint()
                  }}
                />
                <Button onClick={addKeyPoint} className="gap-1">
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="outline" onClick={onBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>

          <Button size="lg" onClick={onNext} className="gap-2">
            Publish Training
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
