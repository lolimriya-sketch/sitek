import type React from "react"
import { redirect } from "next/navigation"
import { requireAdmin } from "@/lib/auth"
import { AdminNav } from "@/components/admin-nav"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let user
  try {
    user = await requireAdmin()
  } catch {
    redirect("/")
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNav userName={user.name} userId={user.id} />
      <main className="fixed-container" style={{ padding: '16px' }}>
        {children}
      </main>
    </div>
  )
}
