'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Users } from 'lucide-react'
import { AssignTrainingDialog } from './assign-training-dialog'

interface AssignTrainingButtonProps {
  trainingId: string
  trainingTitle: string
}

export function AssignTrainingButton({ trainingId, trainingTitle }: AssignTrainingButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <>
      <Button variant="outline" className="gap-2" onClick={() => setDialogOpen(true)}>
        <Users className="h-4 w-4" />
        Assign to Employees
      </Button>

      <AssignTrainingDialog
        trainingId={trainingId}
        trainingTitle={trainingTitle}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  )
}
