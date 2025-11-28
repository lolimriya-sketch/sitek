"use server"

import { cookies } from "next/headers"
import { validateLogin, requireAdmin, getCurrentUser, requireSuperAdmin, requireAuth } from "@/lib/auth"
import { clientDB } from "@/lib/db"
import type { User } from "@/lib/types"
import { revalidatePath } from "next/cache"

export async function loginAction(email: string, password: string) {
  const users = clientDB.getUsers()
  const result = await validateLogin(email, password, users)

  if (!result) {
    return { success: false, error: "Невірний email або пароль" }
  }

  const cookieStore = await cookies()
  cookieStore.set("auth_token", result.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24,
  })

  return { success: true, user: result.user }
}

export async function logoutAction() {
  const cookieStore = await cookies()
  cookieStore.delete("auth_token")
  revalidatePath("/")
}

export async function createUserAction(email: string, password: string, name: string, role: "superadmin" | "admin" | "user") {
  try {
    const admin = await requireAdmin()
    const users = clientDB.getUsers()

    const id = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const user: User & { password: string } = {
      id,
      email,
      password,
      name,
      role,
      createdAt: new Date().toISOString(),
      createdBy: admin.id,
    }

    users.push(user)
    clientDB.setUsers(users)

    revalidatePath("/admin/users")
    return {
      success: true,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, createdAt: user.createdAt },
    }
  } catch (error) {
    return { success: false, error: "Не вдалося створити користувача" }
  }
}

export async function getCurrentUserAction() {
  const user = await getCurrentUser()
  return user
}

const MAIN_ADMIN_ID = "admin-1"

export async function getAllUsersAction() {
  try {
    await requireAdmin()
    const users = clientDB.getUsers()
    const filtered = users
      .filter((u: any) => u.id !== MAIN_ADMIN_ID)
      .map((u: any) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        createdAt: u.createdAt,
        createdBy: u.createdBy,
      }))
    return { success: true, users: filtered }
  } catch {
    return { success: false, error: "Доступ заборонено" }
  }
}

export async function getAllAdminsAction() {
  try {
    const users = clientDB.getUsers()
    const admins = users
      .filter((u: any) => u.role === "admin" || u.role === "superadmin")
      .map((u: any) => ({
        id: u.id,
        name: u.name,
      }))
    return { success: true, admins }
  } catch {
    return { success: false, error: "Помилка отримання списку адміністраторів" }
  }
}

export async function updateUserRoleAction(userId: string, role: "superadmin" | "admin" | "user") {
  try {
    // Only admins can change roles; only superadmins can assign superadmin
    const actor = await requireAdmin()
    if (role === "superadmin") {
      await requireSuperAdmin()
    }
    const users = clientDB.getUsers()
    const user = users.find((u: any) => u.id === userId)
    if (!user) return { success: false }

    user.role = role
    clientDB.setUsers(users)
    revalidatePath("/admin/users")
    return { success: true }
  } catch {
    return { success: false }
  }
}

export async function deleteUserAction(userId: string) {
  try {
    await requireAdmin()
    if (userId === MAIN_ADMIN_ID) return { success: false }

    const users = clientDB.getUsers()
    const filtered = users.filter((u: any) => u.id !== userId)
    if (filtered.length === users.length) return { success: false }

    clientDB.setUsers(filtered)
    revalidatePath("/admin/users")
    return { success: true }
  } catch {
    return { success: false }
  }
}

export async function updateUserAction(userId: string, updates: { email?: string; name?: string; password?: string }) {
  try {
    const actor = await requireAuth()
    const users = clientDB.getUsers()
    const user = users.find((u: any) => u.id === userId)
    if (!user) return { success: false, error: "Користувача не знайдено" }

    // If changing password of an admin/superadmin, only superadmin may do it
    if (updates.password && (user.role === "admin" || user.role === "superadmin")) {
      if (actor.role !== "superadmin") return { success: false, error: "Доступ заборонено" }
    } else {
      // For other updates, admin-level access is sufficient
      await requireAdmin()
    }

    if (updates.email) user.email = updates.email
    if (updates.name) user.name = updates.name
    if (updates.password) user.password = updates.password

    clientDB.setUsers(users)
    revalidatePath("/admin/users")
    return { success: true }
  } catch (error) {
    return { success: false, error: "Не вдалося оновити користувача" }
  }
}

export async function changeMainAdminPasswordAction(currentPassword: string, newPassword: string) {
  try {
    const user = await requireAdmin()

    if (user.id !== MAIN_ADMIN_ID) {
      return { success: false, error: "Доступ заборонено" }
    }

    const users = clientDB.getUsers()
    const mainAdmin = users.find((u: any) => u.id === MAIN_ADMIN_ID)

    if (!mainAdmin) return { success: false, error: "Адміна не знайдено" }
    if (mainAdmin.password !== currentPassword) {
      return { success: false, error: "Невірний поточний пароль" }
    }

    mainAdmin.password = newPassword
    clientDB.setUsers(users)

    return { success: true }
  } catch (error) {
    return { success: false, error: "Не вдалося змінити пароль" }
  }
}
