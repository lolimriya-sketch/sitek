import type { CourseProgress, UserInteraction } from "./types"
import { clientDB, serverDB } from "./db"

function getDB() {
  if (typeof window === "undefined") return serverDB
  return clientDB
}

export function startCourse(userId: string, courseId: string, initialScene?: string): CourseProgress {
  const db = getDB()
  const progressList = db.getProgress()

  const id = `progress-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  const newProgress: CourseProgress = {
    id,
    userId,
    courseId,
    startedAt: new Date().toISOString(),
    duration: 0,
    tabExits: 0,
    status: "in-progress",
    currentScene: initialScene,
    interactions: [],
  }

  progressList.push(newProgress)
  db.setProgress(progressList)
  return newProgress
}

export function updateProgress(progressId: string, updates: Partial<CourseProgress>): CourseProgress | null {
  const db = getDB()
  const progressList = db.getProgress()
  const index = progressList.findIndex((p: CourseProgress) => p.id === progressId)
  if (index === -1) return null

  const updated = {
    ...progressList[index],
    ...updates,
  }

  progressList[index] = updated
  db.setProgress(progressList)
  return updated
}

export function addInteraction(
  progressId: string,
  sceneId: string,
  elementId: string,
  elementType: string,
  action: string,
  value?: any,
): CourseProgress | null {
  const db = getDB()
  const progressList = db.getProgress()
  const index = progressList.findIndex((p: CourseProgress) => p.id === progressId)
  if (index === -1) return null

  const interaction: UserInteraction = {
    timestamp: new Date().toISOString(),
    sceneId,
    elementId,
    elementType,
    action,
    value,
  }

  const current = progressList[index]
  const updated = {
    ...current,
    interactions: [...(current.interactions || []), interaction],
  }

  progressList[index] = updated
  db.setProgress(progressList)
  return updated
}

export function completeCourse(progressId: string, duration: number, tabExits: number): CourseProgress | null {
  return updateProgress(progressId, {
    completedAt: new Date().toISOString(),
    duration,
    tabExits,
    status: "completed",
  })
}

export function getUserProgress(userId: string): CourseProgress[] {
  const db = getDB()
  const progressList = db.getProgress()
  return progressList.filter((p: CourseProgress) => p.userId === userId)
}

export function getCompletedCourses(userId: string): CourseProgress[] {
  const db = getDB()
  const progressList = db.getProgress()
  return progressList.filter((p: CourseProgress) => p.userId === userId && p.status === "completed")
}

export function getCourseProgress(userId: string, courseId: string): CourseProgress | null {
  const db = getDB()
  const progressList = db.getProgress()
  return (
    progressList.find(
      (p: CourseProgress) => p.userId === userId && p.courseId === courseId && p.status === "in-progress",
    ) || null
  )
}

export function getAllCourseProgress(courseId: string): CourseProgress[] {
  const db = getDB()
  const progressList = db.getProgress()
  return progressList.filter((p: CourseProgress) => p.courseId === courseId)
}

export function resetProgress(progressId: string): boolean {
  const db = getDB()
  const progressList = db.getProgress()
  const filtered = progressList.filter((p: CourseProgress) => p.id !== progressId)
  if (filtered.length === progressList.length) return false

  db.setProgress(filtered)
  return true
}
