"use server"

import { requireAdmin, getCurrentUser } from "@/lib/auth"
import {
  getAllCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  getPublishedCourses,
  assignCourse,
  unassignCourse,
  getUserAssignedCourses,
  getCourseAssignments,
} from "@/lib/courses"
import type { Course } from "@/lib/types"
import { revalidatePath } from "next/cache"

export async function getAllCoursesAction() {
  try {
    await requireAdmin()
    const courses = getAllCourses()
    return { success: true, courses }
  } catch {
    return { success: false, error: "Доступ заборонено" }
  }
}

export async function getCourseByIdAction(id: string) {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: "Не авторизовано" }

  const course = getCourseById(id)
  if (!course) return { success: false, error: "Курс не знайдено" }

  if (user.role === "user" && !course.published) {
    return { success: false, error: "Курс недоступний" }
  }

  return { success: true, course }
}

export async function createCourseAction(title: string, description: string) {
  try {
    const admin = await requireAdmin()
    const course = createCourse(title, description, admin.id)
    revalidatePath("/admin/courses")
    return { success: true, course }
  } catch {
    return { success: false, error: "Не вдалося створити курс" }
  }
}

export async function updateCourseAction(id: string, updates: Partial<Omit<Course, "id" | "createdAt" | "createdBy">>) {
  try {
    await requireAdmin()
    const course = updateCourse(id, updates)
    if (!course) return { success: false, error: "Курс не знайдено" }
    revalidatePath("/admin/courses")
    revalidatePath(`/admin/courses/${id}`)
    return { success: true, course }
  } catch {
    return { success: false, error: "Не вдалося оновити курс" }
  }
}

export async function deleteCourseAction(id: string) {
  try {
    await requireAdmin()
    const success = deleteCourse(id)
    revalidatePath("/admin/courses")
    return { success }
  } catch {
    return { success: false }
  }
}

export async function getPublishedCoursesAction() {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: "Не авторизовано" }

  const courses = getPublishedCourses()
  return { success: true, courses }
}

export async function assignCourseAction(courseId: string, userId: string) {
  try {
    const admin = await requireAdmin()
    const assignment = assignCourse(courseId, userId, admin.id)
    revalidatePath("/admin/courses")
    return { success: true, assignment }
  } catch {
    return { success: false, error: "Не вдалося призначити курс" }
  }
}

export async function unassignCourseAction(courseId: string, userId: string) {
  try {
    await requireAdmin()
    const success = unassignCourse(courseId, userId)
    revalidatePath("/admin/courses")
    return { success }
  } catch {
    return { success: false }
  }
}

export async function getUserAssignedCoursesAction() {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: "Не авторизовано" }

  const courses = getUserAssignedCourses(user.id)
  return { success: true, courses }
}

export async function getCourseAssignmentsAction(courseId: string) {
  try {
    await requireAdmin()
    const assignments = getCourseAssignments(courseId)
    return { success: true, assignments }
  } catch {
    return { success: false, error: "Доступ заборонено" }
  }
}
