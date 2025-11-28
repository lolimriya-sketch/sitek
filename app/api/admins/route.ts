import { NextResponse } from "next/server"
import { serverDB } from "@/lib/db"

export async function GET() {
  try {
    const users = serverDB.getUsers()
    const admins = users
      .filter((u: any) => u.role === "admin" || u.role === "superadmin")
      .map((u: any) => ({ id: u.id, name: u.name }))
    return NextResponse.json({ success: true, admins })
  } catch (err) {
    return NextResponse.json({ success: false, error: "Cannot fetch admins" }, { status: 500 })
  }
}
