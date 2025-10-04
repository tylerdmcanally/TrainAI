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
import { UserPlus, Loader2, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
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
    const supabase = createClient()

    // Get user's company
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!profile) return

    // Get all published trainings for this company
    const { data: allTrainings } = await supabase
      .from('training_modules')
      .select('*')
      .eq('company_id', profile.company_id)
      .eq('status', 'published')
      .order('created_at', { ascending: false })

    // Get already assigned trainings
    const { data: assignments } = await supabase
      .from('assignments')
      .select('module_id')
      .eq('employee_id', employeeId)

    const assignedIds = assignments?.map(a => a.module_id) || []
    setAssignedTrainings(assignedIds)
    setTrainings(allTrainings || [])
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

  const availableTrainings = trainings.filter(t => !assignedTrainings.includes(t.id))

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
              Select training modules to assign. Only published trainings are shown.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {availableTrainings.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No trainings available to assign.</p>
                <p className="text-sm mt-2">All published trainings have been assigned.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {availableTrainings.map((training) => (
                  <Card
                    key={training.id}
                    className={`cursor-pointer transition-all ${
                      selectedTrainings.includes(training.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'hover:border-gray-400'
                    }`}
                    onClick={() => toggleTraining(training.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedTrainings.includes(training.id)}
                          onCheckedChange={() => toggleTraining(training.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{training.title}</h4>
                          {training.description && (
                            <p className="text-sm text-gray-600 mt-1">{training.description}</p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span>{Math.ceil(training.video_duration / 60)} min</span>
                            <span>{training.chapters?.length || 0} chapters</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
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
