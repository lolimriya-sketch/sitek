"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function LoginForm() {
  const router = useRouter()
  const [login, setLogin] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: login, password }),
      })
      const result = await res.json()

      if (res.ok && result.success) {
        // set non-httpOnly cookie so server-side pages using cookies can read it
        document.cookie = `auth_token=${result.token}; path=/; max-age=${60 * 60 * 24}; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
        if (result.user?.role === 'admin') router.push('/admin')
        else router.push('/dashboard')
        router.refresh()
      } else {
        setError(result.error || 'Помилка входу')
      }
    } catch (err) {
      setError('Помилка входу')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">Вхід до системи</CardTitle>
        <CardDescription className="text-center">Введіть свої облікові дані для входу</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="login">Логін</Label>
            <Input
              id="login"
              type="text"
              placeholder="Введіть логін"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Пароль</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <div className="text-sm text-destructive text-center">{error}</div>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Вхід..." : "Увійти"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
