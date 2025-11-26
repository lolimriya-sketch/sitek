"use client"

import React, { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"

interface EditProfileFormProps {
  userId: string
  initialEmail: string
  initialName: string
}

export function EditProfileForm({ userId, initialEmail, initialName }: EditProfileFormProps) {
  const [email, setEmail] = useState(initialEmail)
  const [name, setName] = useState(initialName)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/users')
      const users = res.ok ? await res.json() : []
      const updated = (users || []).map((u: any) => (u.id === userId ? { ...u, email, name } : u))
      const save = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users: updated }),
      })

      if (save.ok) {
        toast({ title: 'Успіх', description: 'Профіль оновлено' })
        // refresh page
        setTimeout(() => window.location.reload(), 200)
      } else {
        const data = await save.json()
        toast({ variant: 'destructive', title: 'Помилка', description: data.error || 'Не вдалося оновити профіль' })
      }
    } catch (err) {
      toast({ variant: 'destructive', title: 'Помилка', description: 'Не вдалося оновити профіль' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="profile-name">Ім'я</Label>
        <Input id="profile-name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="profile-email">Email</Label>
        <Input id="profile-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={loading}>{loading ? 'Збереження...' : 'Зберегти'}</Button>
      </div>
    </form>
  )
}

export default EditProfileForm
