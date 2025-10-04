'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Loader2, UserPlus, X } from 'lucide-react'

interface AssignTrainingDialogProps {
  trainingId: string
  trainingTitle: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface Employee {
  id: string
  name: string
  email: string
}

interface Assignment {
  employee_id: string
  status: string
}

export function AssignTrainingDialog({
  trainingId,
  trainingTitle,
  open,
  onOpenChange,
}: AssignTrainingDialogProps) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      loadData()
    }
  }, [open, trainingId])

  const loadData = async () => {
    setLoading(true)
    setError(null)

    try {
      // Load employees and existing assignments in parallel
      const [employeesRes, assignmentsRes] = await Promise.all([
        fetch('/api/employees'),
        fetch(`/api/training/${trainingId}/assignments`),
      ])

      if (employeesRes.ok) {
        const data = await employeesRes.json()
        setEmployees(data.employees || [])
      }

      if (assignmentsRes.ok) {
        const data = await assignmentsRes.json()
        setAssignments(data.assignments || [])
      }
    } catch (err) {
      console.error('Failed to load data:', err)
      setError('Failed to load employees')
    } finally {
      setLoading(false)
    }
  }

  const handleAssign = async () => {
    if (selectedEmployees.size === 0) return

    setAssigning(true)
    setError(null)

    try {
      const response = await fetch(`/api/training/${trainingId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeIds: Array.from(selectedEmployees),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to assign training')
      }

      // Reload assignments
      await loadData()
      setSelectedEmployees(new Set())
    } catch (err) {
      console.error('Assignment error:', err)
      setError('Failed to assign training')
    } finally {
      setAssigning(false)
    }
  }

  const getAssignmentStatus = (employeeId: string) => {
    const assignment = assignments.find((a) => a.employee_id === employeeId)
    return assignment?.status || null
  }

  const toggleEmployee = (employeeId: string) => {
    const newSelected = new Set(selectedEmployees)
    if (newSelected.has(employeeId)) {
      newSelected.delete(employeeId)
    } else {
      newSelected.add(employeeId)
    }
    setSelectedEmployees(newSelected)
  }

  const handleUnassign = async (employeeId: string) => {
    setError(null)

    try {
      const response = await fetch('/api/assignments/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId,
          trainingId,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to un-assign training')
      }

      // Reload assignments
      await loadData()
    } catch (err) {
      console.error('Un-assign error:', err)
      setError('Failed to un-assign training')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Assign Training</DialogTitle>
          <DialogDescription>
            Select employees to assign &quot;{trainingTitle}&quot; to. You can assign to multiple employees and reassign at any time.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : employees.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No employees found. Add employees to your company first.
            </div>
          ) : (
            <div className="space-y-2">
              {employees.map((employee) => {
                const status = getAssignmentStatus(employee.id)
                const selected = selectedEmployees.has(employee.id)

                return (
                  <div
                    key={employee.id}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                      !status && selected
                        ? 'bg-blue-50 border-blue-200'
                        : 'hover:bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{employee.name}</span>
                        {status && (
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              status === 'completed'
                                ? 'bg-green-100 text-green-700'
                                : status === 'in_progress'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {status === 'completed' ? 'Completed' : status === 'in_progress' ? 'In Progress' : 'Not Started'}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">{employee.email}</div>
                    </div>

                    {!status ? (
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleEmployee(employee.id)}
                        className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUnassign(employee.id)}
                        className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="h-4 w-4" />
                        Un-assign
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            onClick={handleAssign}
            disabled={selectedEmployees.size === 0 || assigning}
            className="gap-2"
          >
            {assigning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Assigning...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" />
                Assign to {selectedEmployees.size} Employee{selectedEmployees.size !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
