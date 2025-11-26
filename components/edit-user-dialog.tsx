"use client"

import type React from "react"

import { useState } from "react"
import type { User } from "@/lib/types"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
// using REST API instead of server actions
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

interface EditUserDialogProps {
  user: User
  open: boolean
  onClose: () => void
}

export function EditUserDialog({ user, open, onClose }: EditUserDialogProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [email, setEmail] = useState(user.email)
  const [name, setName] = useState(user.name)
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/users')
      const users = res.ok ? await res.json() : []
      const updated = users.map((u: any) => (u.id === user.id ? { ...u, email, name, ...(password ? { password } : {}) } : u))
      const saveRes = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users: updated }),
      })

      if (saveRes.ok) {
      toast({
        title: "Успіх",
        description: "Дані користувача оновлено",
      })
      onClose()
      router.refresh()
      } else {
        toast({ variant: 'destructive', title: 'Помилка', description: 'Не вдалося зберегти користувача' })
      }
    } catch (err) {
      toast({ variant: 'destructive', title: 'Помилка', description: 'Не вдалося зберегти користувача' })
    }

    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Редагувати користувача</DialogTitle>
          <DialogDescription>
            Змініть дані користувача. Залиште пароль порожнім, щоб не змінювати його.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Ім'я</Label>
            <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-email">Email</Label>
            <Input id="edit-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-password">Новий пароль (опціонально)</Label>
            <Input
              id="edit-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Залиште порожнім для збереження поточного"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Скасувати
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Збереження..." : "Зберегти"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
