'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { X, Loader2 } from 'lucide-react'

interface UnassignTrainingButtonProps {
  employeeId: string
  trainingId: string
}

export function UnassignTrainingButton({ employeeId, trainingId }: UnassignTrainingButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleUnassign = async () => {
    if (!confirm('Are you sure you want to un-assign this training?')) {
      return
    }

    setLoading(true)

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

      if (!response.ok) {
        throw new Error('Failed to un-assign training')
      }

      router.refresh()
    } catch (error) {
      console.error('Error un-assigning training:', error)
      alert('Failed to un-assign training')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleUnassign}
      disabled={loading}
      className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Un-assigning...
        </>
      ) : (
        <>
          <X className="h-4 w-4" />
          Un-assign
        </>
      )}
    </Button>
  )
}
