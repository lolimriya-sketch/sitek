import { NextResponse } from "next/server"
import { createCallRequest, getPendingCallRequests, updateCallStatus, getCallRequest } from "@/lib/calls"
import { getCurrentUser } from "@/lib/auth"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const id = url.searchParams.get("id")
  if (id) {
    const found = getCallRequest(id)
    return NextResponse.json(found || null)
  }
  const pending = getPendingCallRequests()
  return NextResponse.json(pending)
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId, userName, targetAdminId } = body
    let uid = userId
    let uname = userName
    if (!uid || !uname) {
      // Try to infer from current user (server-side)
      const user = await getCurrentUser()
      if (!user) return NextResponse.json({ error: "Missing fields and not authenticated" }, { status: 400 })
      uid = user.id
      uname = user.name
    }
    const req = createCallRequest(uid, uname, targetAdminId)
    return NextResponse.json({ success: true, request: req })
  } catch (err) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { id, status } = body
    if (!id || !status) return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    const updated = updateCallStatus(id, status)
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ success: true, request: updated })
  } catch (err) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}
