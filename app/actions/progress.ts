"use server"

import { getCurrentUser } from "@/lib/auth"
import {
  startCourse,
  completeCourse,
  getCompletedCourses,
  addInteraction,
  getAllCourseProgress,
  resetProgress,
} from "@/lib/progress"
import { revalidatePath } from "next/cache"

export async function startCourseAction(userId: string, courseId: string) {
  try {
    const user = await getCurrentUser()
    if (!user || user.id !== userId) {
      return { success: false, error: "Не авторизовано" }
    }

    const progress = startCourse(userId, courseId)
    return { success: true, progressId: progress.id }
  } catch {
    return { success: false, error: "Помилка" }
  }
}

export async function completeCourseAction(progressId: string, duration: number, tabExits: number) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: "Не авторизовано" }
    }

    const progress = completeCourse(progressId, duration, tabExits)
    revalidatePath("/dashboard/completed")
    return { success: true, progress }
  } catch {
    return { success: false, error: "Помилка" }
  }
}

export async function getCompletedCoursesAction() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: "Не авторизовано" }
    }

    const courses = getCompletedCourses(user.id)
    return { success: true, courses }
  } catch {
    return { success: false, error: "Помилка" }
  }
}

export async function trackInteractionAction(
  progressId: string,
  sceneId: string,
  elementId: string,
  elementType: string,
  action: string,
  value?: any,
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: "Не авторизовано" }
    }

    const progress = addInteraction(progressId, sceneId, elementId, elementType, action, value)
    return { success: true, progress }
  } catch {
    return { success: false, error: "Помилка" }
  }
}

export async function getCourseAnalyticsAction(courseId: string) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== "admin") {
      return { success: false, error: "Доступ заборонено" }
    }

    const progress = getAllCourseProgress(courseId)
    return { success: true, progress }
  } catch {
    return { success: false, error: "Помилка" }
  }
}

export async function resetProgressAction(progressId: string) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== "admin") {
      return { success: false, error: "Доступ заборонено" }
    }

    const success = resetProgress(progressId)
    revalidatePath("/admin/courses")
    return { success }
  } catch {
    return { success: false, error: "Помилка" }
  }
}
