"use server"

import { getCurrentUser, requireAdmin } from "@/lib/auth"
import { createCallRequest, getPendingCallRequests, updateCallStatus, getCallRequest } from "@/lib/calls"

export async function createCallRequestAction() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: "Не авторизовано" }
    }

    const request = createCallRequest(user.id, user.name)
    return { success: true, request }
  } catch {
    return { success: false, error: "Помилка створення запиту" }
  }
}

export async function getPendingCallRequestsAction() {
  try {
    await requireAdmin()
    const requests = getPendingCallRequests()
    return { success: true, requests }
  } catch {
    return { success: false, error: "Доступ заборонено" }
  }
}

export async function updateCallStatusAction(id: string, status: "accepted" | "rejected" | "ended") {
  try {
    await requireAdmin()
    const request = updateCallStatus(id, status)
    return { success: true, request }
  } catch {
    return { success: false, error: "Помилка оновлення статусу" }
  }
}

export async function getCallRequestAction(id: string) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: "Не авторизовано" }
    }

    const request = getCallRequest(id)
    return { success: true, request }
  } catch {
    return { success: false, error: "Помилка" }
  }
}
