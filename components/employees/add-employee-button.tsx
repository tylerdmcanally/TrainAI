'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { UserPlus } from 'lucide-react'
import { AddEmployeeDialog } from './add-employee-dialog'

interface AddEmployeeButtonProps {
  companyId: string
}

export function AddEmployeeButton({ companyId }: AddEmployeeButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <>
      <Button className="gap-2" onClick={() => setDialogOpen(true)}>
        <UserPlus className="h-4 w-4" />
        Add Employee
      </Button>

      <AddEmployeeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        companyId={companyId}
      />
    </>
  )
}
