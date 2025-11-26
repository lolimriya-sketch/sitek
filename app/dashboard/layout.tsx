import type React from "react"
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { UserNav } from "@/components/user-nav"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let user
  try {
    user = await getCurrentUser()
    if (!user) throw new Error()
    if (user.role === "admin") {
      redirect("/admin")
    }
  } catch {
    redirect("/")
  }

  return (
    <div className="min-h-screen bg-background">
      <UserNav userName={user.name} />
      <main className="fixed-container" style={{ padding: '16px' }}>
        {children}
      </main>
    </div>
  )
}
