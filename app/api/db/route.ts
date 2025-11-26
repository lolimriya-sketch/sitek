import { NextResponse } from "next/server"
import { serverDB } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    // allow bulk overwrite of entire DB or partial keys
  // Overwrite keys if provided
    const current = {
      users: serverDB.getUsers(),
      courses: serverDB.getCourses(),
      progress: serverDB.getProgress(),
      assignments: serverDB.getAssignments(),
      calls: serverDB.getCalls(),
    }

    if (body.users) current.users = body.users
    if (body.courses) current.courses = body.courses
    if (body.progress) current.progress = body.progress
    if (body.assignments) current.assignments = body.assignments
    if (body.calls) current.calls = body.calls

    // persist
    serverDB.setUsers(current.users)
    serverDB.setCourses(current.courses)
    serverDB.setProgress(current.progress)
    serverDB.setAssignments(current.assignments)
    serverDB.setCalls(current.calls)

    return NextResponse.json({ success: true, data: current })
  } catch (error) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}

export async function GET() {
  return NextResponse.json({
    users: serverDB.getUsers(),
    courses: serverDB.getCourses(),
    progress: serverDB.getProgress(),
    assignments: serverDB.getAssignments(),
    calls: serverDB.getCalls(),
  })
}
