import { NextResponse } from "next/server"
import { serverDB } from "@/lib/db"

export async function GET() {
  const users = serverDB.getUsers()
  return NextResponse.json(users)
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    // Accept either { users: [...] } to overwrite, or single user to create
    if (Array.isArray(body.users)) {
      serverDB.setUsers(body.users)
      return NextResponse.json({ success: true })
    }

    const user = body
    const users = serverDB.getUsers()
    const id = `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const newUser = { ...user, id, createdAt: new Date().toISOString() }
    users.push(newUser)
    serverDB.setUsers(users)
    return NextResponse.json({ success: true, user: newUser })
  } catch (err) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}
