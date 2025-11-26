import { NextResponse } from "next/server"
import { serverDB } from "@/lib/db"
import { getCourseAssignments } from "@/lib/courses"

export async function GET() {
  const progress = serverDB.getProgress()
  return NextResponse.json(progress)
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    if (Array.isArray(body.progress)) {
      // Persist progress list
      serverDB.setProgress(body.progress)

      // For any progress entries marked completed, remove assignment for that user/course
      try {
        const assignments = serverDB.getAssignments()
        let updated = assignments
        for (const p of body.progress) {
          if (p.status === "completed") {
            updated = updated.filter((a: any) => !(a.courseId === p.courseId && a.userId === p.userId))
          }
        }
        serverDB.setAssignments(updated)
      } catch (e) {
        // ignore assignment cleanup errors
      }
      return NextResponse.json({ success: true })
    }

    const progressList = serverDB.getProgress()
    const id = `progress-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const item = { ...body, id, startedAt: new Date().toISOString() }
    progressList.push(item)
    serverDB.setProgress(progressList)
    return NextResponse.json({ success: true, progress: item })
  } catch (err) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}
