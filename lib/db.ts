// Unified database layer that works both on client and server
// On client: uses localStorage
// On server: uses data passed from client via API

export interface DatabaseData {
  users: any[]
  courses: any[]
  progress: any[]
  assignments: any[]
  calls: any[]
}

// Client-side storage (localStorage)
export const clientDB = {
  getUsers(): any[] {
    if (typeof window === "undefined") return []
    const data = localStorage.getItem("lms_users")
    return data ? JSON.parse(data) : []
  },

  setUsers(users: any[]) {
    if (typeof window === "undefined") return
    localStorage.setItem("lms_users", JSON.stringify(users))
  },

  getCourses(): any[] {
    if (typeof window === "undefined") return []
    const data = localStorage.getItem("lms_courses")
    return data ? JSON.parse(data) : []
  },

  setCourses(courses: any[]) {
    if (typeof window === "undefined") return
    localStorage.setItem("lms_courses", JSON.stringify(courses))
  },

  getProgress(): any[] {
    if (typeof window === "undefined") return []
    const data = localStorage.getItem("lms_progress")
    return data ? JSON.parse(data) : []
  },

  setProgress(progress: any[]) {
    if (typeof window === "undefined") return
    localStorage.setItem("lms_progress", JSON.stringify(progress))
  },

  getAssignments(): any[] {
    if (typeof window === "undefined") return []
    const data = localStorage.getItem("lms_assignments")
    return data ? JSON.parse(data) : []
  },

  setAssignments(assignments: any[]) {
    if (typeof window === "undefined") return
    localStorage.setItem("lms_assignments", JSON.stringify(assignments))
  },

  getCalls(): any[] {
    if (typeof window === "undefined") return []
    const data = localStorage.getItem("lms_calls")
    return data ? JSON.parse(data) : []
  },

  setCalls(calls: any[]) {
    if (typeof window === "undefined") return
    localStorage.setItem("lms_calls", JSON.stringify(calls))
  },

  initializeDefaultAdmin() {
    const users = this.getUsers()
    if (users.length === 0) {
      const defaultAdmin = {
        id: "admin-1",
        email: "admin@system.com",
        name: "Головний Адміністратор",
        role: "admin",
        password: "admin123",
        createdAt: new Date().toISOString(),
      }
      this.setUsers([defaultAdmin])
    }
  },
}
export const serverDB = clientDB; // Додаємо alias для serverDB
