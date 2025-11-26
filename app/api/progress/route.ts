import { NextResponse } from "next/server"
import { serverDB } from "@/lib/db"

export async function GET() {
  const progress = serverDB.getProgress()
  return NextResponse.json(progress)
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    if (Array.isArray(body.progress)) {
      serverDB.setProgress(body.progress)
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
