'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { UserPlus, Loader2, CheckCircle2, X } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface AssignTrainingButtonProps {
  employeeId: string
  employeeName: string
}

export function AssignTrainingButton({ employeeId, employeeName }: AssignTrainingButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [trainings, setTrainings] = useState<any[]>([])
  const [selectedTrainings, setSelectedTrainings] = useState<string[]>([])
  const [assignedTrainings, setAssignedTrainings] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      fetchTrainings()
    }
  }, [open])

  const fetchTrainings = async () => {
    try {
      const response = await fetch(`/api/training/published?employee_id=${employeeId}`)

      if (!response.ok) {
        console.error('Failed to fetch trainings:', response.statusText)
        return
      }

      const data = await response.json()

      const assignedIds = data.assignments?.map((a: any) => a.module_id) || []
      setAssignedTrainings(assignedIds)
      setTrainings(data.trainings || [])
    } catch (error) {
      console.error('Error fetching trainings:', error)
    }
  }

  const handleAssign = async () => {
    if (selectedTrainings.length === 0) {
      setError('Please select at least one training')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/assignments/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employeeId,
          trainingIds: selectedTrainings,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to assign trainings')
      }

      // Success!
      setSelectedTrainings([])
      setOpen(false)
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to assign trainings')
    } finally {
      setLoading(false)
    }
  }

  const toggleTraining = (trainingId: string) => {
    setSelectedTrainings(prev =>
      prev.includes(trainingId)
        ? prev.filter(id => id !== trainingId)
        : [...prev, trainingId]
    )
  }

  const isAssigned = (trainingId: string) => assignedTrainings.includes(trainingId)

  const handleUnassign = async (trainingId: string) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/assignments/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employeeId,
          trainingId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to un-assign training')
      }

      // Refresh the trainings list
      await fetchTrainings()
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to un-assign training')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <UserPlus className="h-4 w-4" />
        Assign Training
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assign Training to {employeeName}</DialogTitle>
            <DialogDescription>
              Select training modules to assign. You can assign or reassign trainings at any time.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {trainings.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No published trainings available.</p>
                <p className="text-sm mt-2">Create and publish a training first.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {trainings.map((training) => {
                  const assigned = isAssigned(training.id)
                  return (
                    <Card
                      key={training.id}
                      className={`transition-all ${
                        !assigned && selectedTrainings.includes(training.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'hover:border-gray-400'
                      }`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          {!assigned && (
                            <Checkbox
                              checked={selectedTrainings.includes(training.id)}
                              onCheckedChange={() => toggleTraining(training.id)}
                            />
                          )}
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-gray-900">{training.title}</h4>
                              {assigned && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                                  Assigned
                                </span>
                              )}
                            </div>
                            {training.description && (
                              <p className="text-sm text-gray-600 mt-1">{training.description}</p>
                            )}
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                              <span>{Math.ceil(training.video_duration / 60)} min</span>
                              <span>{training.chapters?.length || 0} chapters</span>
                            </div>
                          </div>
                          {assigned && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUnassign(training.id)}
                              disabled={loading}
                              className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <X className="h-4 w-4" />
                              Un-assign
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t">
              <p className="text-sm text-gray-600">
                {selectedTrainings.length} training{selectedTrainings.length !== 1 ? 's' : ''} selected
              </p>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAssign}
                  disabled={loading || selectedTrainings.length === 0}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Assigning...
                    </>
                  ) : (
                    `Assign ${selectedTrainings.length > 0 ? `(${selectedTrainings.length})` : ''}`
                  )}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
