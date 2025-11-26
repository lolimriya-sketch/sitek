import { NextResponse } from "next/server"
import { serverDB } from "@/lib/db"
import { validateLogin } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password } = body
    const users = serverDB.getUsers()
    const result = await validateLogin(email, password, users)
    if (!result) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })

    // Return token and user (client can store cookie if needed)
    return NextResponse.json({ success: true, token: result.token, user: result.user })
  } catch (err) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}
