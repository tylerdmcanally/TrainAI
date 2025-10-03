'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { TrainingData } from '@/app/dashboard/training/create/page'
import { ArrowRight } from 'lucide-react'

interface SetupStepProps {
  data: TrainingData
  onUpdate: (updates: Partial<TrainingData>) => void
  onNext: () => void
}

export function SetupStep({ data, onUpdate, onNext }: SetupStepProps) {
  const isValid = data.title.trim().length > 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Training</CardTitle>
        <CardDescription>
          Start by giving your training a title. You can add more details later.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Training Title *
          </label>
          <Input
            placeholder="e.g., How to Process Returns"
            value={data.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            className="text-lg"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description (optional)
          </label>
          <textarea
            placeholder="Brief description of what this training covers..."
            value={data.description}
            onChange={(e) => onUpdate({ description: e.target.value })}
            className="w-full min-h-[100px] px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">💡 Quick Tips</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Keep your training focused on one specific task</li>
            <li>• Speak clearly and naturally as you record</li>
            <li>• AI will auto-generate documentation from your recording</li>
            <li>• Typical training: 5-15 minutes</li>
          </ul>
        </div>

        <div className="flex justify-end">
          <Button
            size="lg"
            onClick={onNext}
            disabled={!isValid}
            className="gap-2"
          >
            Next: Start Recording
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
