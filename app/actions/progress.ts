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
    // eslint-disable-next-line no-console
    console.error('[actions/progress] startCourseAction error', new Error('startCourseAction failed'))
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
    // eslint-disable-next-line no-console
    console.error('[actions/progress] completeCourseAction error', new Error('completeCourseAction failed'))
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
    // eslint-disable-next-line no-console
    console.error('[actions/progress] getCompletedCoursesAction error', new Error('getCompletedCoursesAction failed'))
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
    // eslint-disable-next-line no-console
    console.error('[actions/progress] trackInteractionAction error', new Error('trackInteractionAction failed'))
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
    // eslint-disable-next-line no-console
    console.error('[actions/progress] getCourseAnalyticsAction error', new Error('getCourseAnalyticsAction failed'))
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
    // eslint-disable-next-line no-console
    console.error('[actions/progress] resetProgressAction error', new Error('resetProgressAction failed'))
    return { success: false, error: "Помилка" }
  }
}
