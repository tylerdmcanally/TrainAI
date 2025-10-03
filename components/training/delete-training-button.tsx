'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Trash2, Loader2 } from 'lucide-react'

interface DeleteTrainingButtonProps {
  trainingId: string
  trainingTitle: string
}

export function DeleteTrainingButton({ trainingId, trainingTitle }: DeleteTrainingButtonProps) {
  const router = useRouter()
  const [showDialog, setShowDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    setDeleting(true)
    setError(null)

    try {
      const response = await fetch(`/api/training/${trainingId}/delete`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to delete training')
      }

      // Success! Redirect to dashboard
      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      console.error('Delete error:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete training. Please try again.')
      setDeleting(false)
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        onClick={() => setShowDialog(true)}
        title="Delete training"
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Training?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{trainingTitle}&quot;? This action cannot be undone.
              All assignments and progress will be permanently deleted.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
              className="gap-2"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Delete Training
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
