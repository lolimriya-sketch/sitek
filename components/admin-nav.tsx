"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Users, BookOpen, LogOut, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { AdminCallsPanel } from "@/components/admin-calls-panel"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Phone } from "lucide-react"

interface AdminNavProps {
  userName: string
  userId: string
}

export function AdminNav({ userName, userId }: AdminNavProps) {
  const pathname = usePathname()

  const navItems = [
    { href: "/admin/users", label: "Користувачі", icon: Users },
    { href: "/admin/courses", label: "Курси", icon: BookOpen },
  ]

  const isMainAdmin = userId === "admin-1"

  async function handleLogout() {
    // Clear client-side auth cookie and redirect
    document.cookie = 'auth_token=; path=/; max-age=0'
    window.location.href = "/"
  }

  return (
    <nav className="border-b bg-card">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/admin" className="text-xl font-bold">
              Адмін-панель
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
              {isMainAdmin && (
                <Link href="/admin/profile">
                  <Button variant={pathname === "/admin/profile" ? "default" : "ghost"} size="sm" className="gap-2">
                    <Settings className="h-4 w-4" />
                    Профіль
                  </Button>
                </Link>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                  <Phone className="h-4 w-4" />
                  Дзвінки
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader className="mb-6">
                  <SheetTitle>Вхідні дзвінки</SheetTitle>
                  <SheetDescription>Приймайте дзвінки від користувачів</SheetDescription>
                </SheetHeader>
                <AdminCallsPanel />
              </SheetContent>
            </Sheet>
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
