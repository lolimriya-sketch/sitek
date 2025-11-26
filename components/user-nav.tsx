"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BookOpen, CheckCircle, Phone, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"

interface UserNavProps {
  userName: string
}

export function UserNav({ userName }: UserNavProps) {
  const pathname = usePathname()

  const navItems = [
    { href: "/dashboard/courses", label: "Курси", icon: BookOpen },
    { href: "/dashboard/completed", label: "Пройдені курси", icon: CheckCircle },
    { href: "/dashboard/contact", label: "Контакт з адміністратором", icon: Phone },
  ]

  async function handleLogout() {
    document.cookie = 'auth_token=; path=/; max-age=0'
    window.location.href = "/"
  }

  return (
    <nav className="border-b bg-card">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="text-xl font-bold">
              Навчальна платформа
            </Link>
            <div className="flex gap-1">
              {navItems.map((item) => {
                const Icon = item.icon
                return (
                  <Link key={item.href} href={item.href}>
                    <Button variant={pathname === item.href ? "default" : "ghost"} size="sm" className="gap-2">
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Button>
                  </Link>
                )
              })}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">{userName}</div>
            <ThemeToggle />
            <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2 bg-transparent">
              <LogOut className="h-4 w-4" />
              Вихід
            </Button>
          </div>
        </div>
      </div>
    </nav>
  )
}
