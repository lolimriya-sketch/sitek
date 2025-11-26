import { cookies } from "next/headers"
import type { User } from "./types"
import { serverDB } from "@/lib/db"

// Simple JWT-like token generation
function generateToken(user: User): string {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
  }
  return Buffer.from(JSON.stringify(payload)).toString("base64")
}

function verifyToken(token: string): User | null {
  try {
    const payload = JSON.parse(Buffer.from(token, "base64").toString())
    if (payload.exp < Date.now()) return null
    return {
      id: payload.id,
      email: payload.email,
      name: payload.name || "",
      role: payload.role,
      createdAt: payload.createdAt || new Date().toISOString(),
    }
  } catch {
    return null
  }
}

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get("auth_token")?.value
  if (!token) return null
  return verifyToken(token)
}

export async function requireAuth(): Promise<User> {
  const user = await getCurrentUser()
  if (!user) throw new Error("Unauthorized")
  return user
}

export async function requireAdmin(): Promise<User> {
  const user = await requireAuth()
  // Allow both admin and superadmin to be treated as admin for most operations
  if (user.role !== "admin" && user.role !== "superadmin") throw new Error("Forbidden")
  return user
}

export async function requireSuperAdmin(): Promise<User> {
  const user = await requireAuth()
  if (user.role !== "superadmin") throw new Error("Forbidden")
  return user
}

export async function validateLogin(
  email: string,
  password: string,
  users: any[],
): Promise<{ user: User; token: string } | null> {
  const user = users.find((u: any) => u.email === email && u.password === password)

  if (!user) return null

  const userData: User = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt,
    createdBy: user.createdBy,
  }

  const token = generateToken(userData)
  return { user: userData, token }
}

// Synchronous helpers for server-side pages that need user lists
export function getAllUsers(): User[] {
  const users = serverDB.getUsers()
  return users.map((u: any) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    createdAt: u.createdAt,
    managerId: u.managerId,
  }))
}

export function getAllUsersExceptMainAdmin(): User[] {
  const MAIN_ADMIN_ID = "admin-1"
  const users = serverDB.getUsers()
  return users
    .filter((u: any) => u.id !== MAIN_ADMIN_ID)
    .map((u: any) => ({ id: u.id, email: u.email, name: u.name, role: u.role, createdAt: u.createdAt }))
}
