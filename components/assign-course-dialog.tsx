"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
// Using REST API instead of Server Actions to avoid forwarded request issues
import { useToast } from "@/hooks/use-toast"
import type { User, CourseAssignment } from "@/lib/types"
import { Loader2 } from "lucide-react"

interface AssignCourseDialogProps {
  courseId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AssignCourseDialog({ courseId, open, onOpenChange }: AssignCourseDialogProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [users, setUsers] = useState<User[]>([])
  const [assignments, setAssignments] = useState<CourseAssignment[]>([])
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      loadData()
    }
  }, [open, courseId])

  async function loadData() {
    setLoading(true)

    try {
      // fetch users from API
      const usersRes = await fetch("/api/users")
      const usersData = usersRes.ok ? await usersRes.json() : []
      const regularUsers = (usersData || []).filter((u: any) => u.role === "user")
      setUsers(regularUsers)

      // fetch assignments from /api/db (returns full DB)
      const dbRes = await fetch("/api/db")
      const db = dbRes.ok ? await dbRes.json() : { assignments: [] }
      const allAssignments = db.assignments || []
      const courseAssignments = allAssignments.filter((a: any) => a.courseId === courseId)
      setAssignments(courseAssignments)
  const assignedUserIds = new Set(((courseAssignments || []) as any[]).map((a: any) => String(a.userId))) as Set<string>
  setSelectedUsers(assignedUserIds)
    } catch (err) {
      setUsers([])
      setAssignments([])
      setSelectedUsers(new Set())
    }

    setLoading(false)
  }

  function toggleUser(userId: string) {
    const newSelected = new Set(selectedUsers)
    if (newSelected.has(userId)) {
      newSelected.delete(userId)
    } else {
      newSelected.add(userId)
    }
    setSelectedUsers(newSelected)
  }

  async function handleSave() {
    setSaving(true)

    try {
      // load full DB to get current assignments
      const dbRes = await fetch('/api/db')
      const db = dbRes.ok ? await dbRes.json() : { assignments: [] }
      const allAssignments = db.assignments || []

      const currentAssignedIds = new Set(assignments.map((a) => a.userId))
      const toAssign = Array.from(selectedUsers).filter((id) => !currentAssignedIds.has(id))
      const toUnassign = Array.from(currentAssignedIds).filter((id) => !selectedUsers.has(id))

      // remove unassigned entries
      let newAssignments = allAssignments.filter((a: any) => !(a.courseId === courseId && toUnassign.includes(String(a.userId))))

      // add new assignments
      for (const userId of toAssign) {
        const entry = {
          id: `assign-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          courseId,
          userId,
          assignedBy: 'system',
          assignedAt: new Date().toISOString(),
        }
        newAssignments.push(entry)
      }

      // persist back
      const saveRes = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignments: newAssignments }),
      })

      if (saveRes.ok) {
        toast({ title: 'Успіх', description: `Призначено ${toAssign.length} користувачів, відкликано ${toUnassign.length}` })
        onOpenChange(false)
        router.refresh()
      } else {
        toast({ variant: 'destructive', title: 'Помилка', description: 'Не вдалося зберегти призначення' })
      }
    } catch (err) {
      toast({ variant: 'destructive', title: 'Помилка', description: 'Не вдалося зберегти призначення' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Призначити курс користувачам</DialogTitle>
          <DialogDescription>Оберіть користувачів, яким буде доступний цей курс</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Немає користувачів для призначення</p>
            <p className="text-sm mt-2">Створіть користувачів у розділі "Користувачі"</p>
          </div>
        ) : (
          <>
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-3">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center space-x-3">
                    <Checkbox
                      id={user.id}
                      checked={selectedUsers.has(user.id)}
                      onCheckedChange={() => toggleUser(user.id)}
                    />
                    <Label htmlFor={user.id} className="flex-1 cursor-pointer">
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </Label>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                Скасувати
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Збереження...
                  </>
                ) : (
                  "Зберегти"
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
