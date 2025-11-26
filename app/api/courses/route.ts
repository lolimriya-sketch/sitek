import { NextResponse } from "next/server"
import { serverDB } from "@/lib/db"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const id = url.searchParams.get("id")
  const courses = serverDB.getCourses()
  if (id) {
    const found = courses.find((c: any) => c.id === id)
    return NextResponse.json(found || null)
  }
  return NextResponse.json(courses)
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    if (Array.isArray(body.courses)) {
      serverDB.setCourses(body.courses)
      return NextResponse.json({ success: true })
    }

    // create course
    const courses = serverDB.getCourses()
    const id = `course-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const course = { ...body, id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    courses.push(course)
    serverDB.setCourses(courses)
    return NextResponse.json({ success: true, course })
  } catch (err) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { id, updates } = body
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })
    const courses = serverDB.getCourses()
    const index = courses.findIndex((c: any) => c.id === id)
    if (index === -1) return NextResponse.json({ error: "Not found" }, { status: 404 })
    const updated = { ...courses[index], ...updates, updatedAt: new Date().toISOString() }
    courses[index] = updated
    serverDB.setCourses(courses)
    return NextResponse.json({ success: true, course: updated })
  } catch (err) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url)
    const idFromQuery = url.searchParams.get("id")
    let id = idFromQuery

    if (!id) {
      const body = await request.json()
      id = body.id
    }

    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const courses = serverDB.getCourses()
    const filtered = courses.filter((c: any) => c.id !== id)
    if (filtered.length === courses.length) return NextResponse.json({ error: "Not found" }, { status: 404 })

    serverDB.setCourses(filtered)
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}
