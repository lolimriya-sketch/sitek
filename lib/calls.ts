import type { CallRequest } from "./types"

// In-memory storage
const callRequests: Map<string, CallRequest> = new Map()
const activeConnections: Map<string, any> = new Map()

export function createCallRequest(userId: string, userName: string): CallRequest {
  const id = `call-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  const request: CallRequest = {
    id,
    userId,
    userName,
    createdAt: new Date().toISOString(),
    status: "pending",
  }
  callRequests.set(id, request)
  return request
}

export function getCallRequest(id: string): CallRequest | null {
  return callRequests.get(id) || null
}

export function getPendingCallRequests(): CallRequest[] {
  return Array.from(callRequests.values()).filter((c) => c.status === "pending")
}

export function updateCallStatus(id: string, status: "accepted" | "rejected" | "ended"): CallRequest | null {
  const request = callRequests.get(id)
  if (!request) return null

  const updated = { ...request, status }
  callRequests.set(id, updated)
  return updated
}

export function deleteCallRequest(id: string): boolean {
  return callRequests.delete(id)
}
