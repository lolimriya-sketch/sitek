"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"

interface ChangePasswordFormProps {
  userId: string
}

export function ChangePasswordForm({ userId }: ChangePasswordFormProps) {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: "Помилка",
        description: "Заповніть всі поля",
        variant: "destructive",
      })
      return
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Помилка",
        description: "Паролі не співпадають",
        variant: "destructive",
      })
      return
    }

    if (newPassword.length < 6) {
      toast({
        title: "Помилка",
        description: "Пароль повинен містити мінімум 6 символів",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      // Fetch users, update main admin password, then overwrite users via API
      const res = await fetch('/api/users')
      const users = res.ok ? await res.json() : []
      const MAIN_ADMIN_ID = 'admin-1'
      const mainAdmin = (users || []).find((u: any) => u.id === MAIN_ADMIN_ID)

      if (!mainAdmin) {
        toast({ variant: 'destructive', title: 'Помилка', description: 'Адміністратор не знайдений' })
        return
      }

      if (mainAdmin.password !== currentPassword) {
        toast({ variant: 'destructive', title: 'Помилка', description: 'Невірний поточний пароль' })
        return
      }

      mainAdmin.password = newPassword

      const save = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users }),
      })

      const saved = await save.json()
      if (save.ok && saved.success !== false) {
        toast({ title: 'Успішно', description: 'Пароль успішно змінено' })
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        toast({ variant: 'destructive', title: 'Помилка', description: saved.error || 'Не вдалося змінити пароль' })
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Помилка', description: 'Сталася помилка при зміні пароля' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="currentPassword">Поточний пароль</Label>
        <Input
          id="currentPassword"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          disabled={loading}
          placeholder="Введіть поточний пароль"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="newPassword">Новий пароль</Label>
        <Input
          id="newPassword"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          disabled={loading}
          placeholder="Введіть новий пароль"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Підтвердіть новий пароль</Label>
        <Input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={loading}
          placeholder="Підтвердіть новий пароль"
        />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "Зміна пароля..." : "Змінити пароль"}
      </Button>
    </form>
  )
}
