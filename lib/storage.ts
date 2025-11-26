// Client-side localStorage wrapper for all data persistence
export const storage = {
  // Users
  getUsers(): any[] {
    if (typeof window === "undefined") return []
    const data = localStorage.getItem("lms_users")
    return data ? JSON.parse(data) : []
  },

  setUsers(users: any[]) {
    if (typeof window === "undefined") return
    localStorage.setItem("lms_users", JSON.stringify(users))
  },

  // Courses
  getCourses(): any[] {
    if (typeof window === "undefined") return []
    const data = localStorage.getItem("lms_courses")
    return data ? JSON.parse(data) : []
  },

  setCourses(courses: any[]) {
    if (typeof window === "undefined") return
    localStorage.setItem("lms_courses", JSON.stringify(courses))
  },

  // Progress
  getProgress(): any[] {
    if (typeof window === "undefined") return []
    const data = localStorage.getItem("lms_progress")
    return data ? JSON.parse(data) : []
  },

  setProgress(progress: any[]) {
    if (typeof window === "undefined") return
    localStorage.setItem("lms_progress", JSON.stringify(progress))
  },

  // Course Assignments
  getAssignments(): any[] {
    if (typeof window === "undefined") return []
    const data = localStorage.getItem("lms_assignments")
    return data ? JSON.parse(data) : []
  },

  setAssignments(assignments: any[]) {
    if (typeof window === "undefined") return
    localStorage.setItem("lms_assignments", JSON.stringify(assignments))
  },

  getMedia(): any[] {
    if (typeof window === "undefined") return []
    const data = localStorage.getItem("lms_media")
    return data ? JSON.parse(data) : []
  },

  setMedia(media: any[]) {
    if (typeof window === "undefined") return
    localStorage.setItem("lms_media", JSON.stringify(media))
  },

  // Initialize default admin
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
