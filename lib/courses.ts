import type { Course, CourseAssignment } from "./types"
import { clientDB, serverDB } from "./db"

function getDB() {
  if (typeof window === "undefined") return serverDB
  return clientDB
}

// Course Assignments
export function assignCourse(courseId: string, userId: string, assignedBy: string): CourseAssignment {
  const db = getDB()
  const assignments = db.getAssignments()

  const id = `assignment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  const assignment: CourseAssignment = {
    id,
    courseId,
    userId,
    assignedBy,
    assignedAt: new Date().toISOString(),
  }

  assignments.push(assignment)
  db.setAssignments(assignments)
  return assignment
}

export function unassignCourse(courseId: string, userId: string): boolean {
  const db = getDB()
  const assignments = db.getAssignments()
  const filtered = assignments.filter((a: CourseAssignment) => !(a.courseId === courseId && a.userId === userId))

  if (filtered.length === assignments.length) return false
  db.setAssignments(filtered)
  return true
}

export function getUserAssignedCourses(userId: string): Course[] {
  const db = getDB()
  const assignments = db.getAssignments()
  const userAssignments = assignments.filter((a: CourseAssignment) => a.userId === userId)

  const courses = db.getCourses()
  return userAssignments
    .map((a: CourseAssignment) => courses.find((c: any) => c.id === a.courseId))
    .filter((c: any): c is Course => c !== undefined && c.published)
}

export function getCourseAssignments(courseId: string): CourseAssignment[] {
  const db = getDB()
  const assignments = db.getAssignments()
  return assignments.filter((a: CourseAssignment) => a.courseId === courseId)
}

export function isUserAssignedToCourse(userId: string, courseId: string): boolean {
  const db = getDB()
  const assignments = db.getAssignments()
  return assignments.some((a: CourseAssignment) => a.userId === userId && a.courseId === courseId)
}

// Course Progress
export function getAllCourseProgress(courseId: string): any[] {
  const db = getDB()
  const progressList = db.getProgress()
  return progressList.filter((p: any) => p.courseId === courseId)
}

export function getAllCourses(): Course[] {
  const db = getDB()
  return db.getCourses()
}

export function getCourseById(id: string): Course | null {
  const db = getDB()
  const courses = db.getCourses()
  return courses.find((c: Course) => c.id === id) || null
}

export function createCourse(title: string, description: string, createdBy: string): Course {
  const db = getDB()
  const courses = db.getCourses()

  const id = `course-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  const course: Course = {
    id,
    title,
    description,
    scenes: [],
    createdBy,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    published: false,
  }

  courses.push(course)
  db.setCourses(courses)
  return course
}

export function updateCourse(
  id: string,
  updates: Partial<Omit<Course, "id" | "createdAt" | "createdBy">>,
): Course | null {
  const db = getDB()
  const courses = db.getCourses()
  const index = courses.findIndex((c: Course) => c.id === id)
  if (index === -1) return null

  const updated = {
    ...courses[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  }

  courses[index] = updated
  db.setCourses(courses)
  return updated
}

export function deleteCourse(id: string): boolean {
  const db = getDB()
  const courses = db.getCourses()
  const filtered = courses.filter((c: Course) => c.id !== id)
  if (filtered.length === courses.length) return false

  db.setCourses(filtered)

  const assignments = db.getAssignments()
  const filteredAssignments = assignments.filter((a: CourseAssignment) => a.courseId !== id)
  db.setAssignments(filteredAssignments)

  return true
}

export function getPublishedCourses(): Course[] {
  const db = getDB()
  const courses = db.getCourses()
  return courses.filter((c: Course) => c.published)
}
