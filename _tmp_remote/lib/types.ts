export type UserRole = "admin" | "user"

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  createdAt: string
  createdBy?: string
}

export interface CourseScene {
  id: string
  name: string
  screenshot?: string // Base64 or URL
  elements: SceneElement[]
  requiredClicks?: string[] // IDs of elements that must be clicked
  nextScene?: string // ID of next scene or "complete"
}

export interface SceneElement {
  id: string
  type: "text" | "image" | "video" | "clickzone" | "arrow" | "tooltip" | "hotspot" | "button" | "input" | "presentation"
  data: any
  position: { x: number; y: number }
  size?: { width: number; height: number }
  rotation?: number
  backgroundColor?: string // "#ffffff" or "transparent"
  clickAction?: {
    type: "next-scene" | "show-tooltip" | "complete" | "goto-scene"
    value?: string // scene ID for goto-scene
  }
}

export interface Course {
  id: string
  title: string
  description: string
  scenes: CourseScene[]
  createdBy: string
  createdAt: string
  updatedAt: string
  published: boolean
  thumbnail?: string
}

export interface CourseContent {
  id: string
  type: "text" | "image" | "video" | "clickzone" | "arrow" | "tooltip"
  data: any
  position: { x: number; y: number }
  size?: { width: number; height: number }
}

export interface CourseProgress {
  id: string
  userId: string
  courseId: string
  startedAt: string
  completedAt?: string
  duration: number
  tabExits: number
  status: "in-progress" | "completed"
  currentScene?: string
  interactions?: UserInteraction[] // Track user interactions
}

export interface UserInteraction {
  timestamp: string
  sceneId: string
  elementId: string
  elementType: string
  action: string
  value?: any // For input fields
}

export interface CourseAssignment {
  id: string
  courseId: string
  userId: string
  assignedBy: string
  assignedAt: string
}

export interface CallRequest {
  id: string
  userId: string
  userName: string
  createdAt: string
  status: "pending" | "accepted" | "rejected" | "ended"
}
