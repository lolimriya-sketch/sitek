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
// Server-side implementation: read/write `data/db.json`
let serverImpl: any = null

if (typeof window === "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const fs = require("fs")
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const path = require("path")
  const dbPath = path.join(process.cwd(), "data", "db.json")

  function readDb(): any {
    try {
      const raw = fs.readFileSync(dbPath, "utf8")
      return JSON.parse(raw)
    } catch (e) {
      return { users: [], courses: [], progress: [], assignments: [], calls: [] }
    }
  }

  function writeDb(data: any) {
    try {
      fs.writeFileSync(dbPath, JSON.stringify(data, null, 2))
    } catch (e) {
      // ignore write errors in dev
    }
  }

  serverImpl = {
    getUsers() {
      const db = readDb()
      return db.users || []
    },
    setUsers(users: any[]) {
      const db = readDb()
      db.users = users
      writeDb(db)
    },
    getCourses() {
      const db = readDb()
      return db.courses || []
    },
    setCourses(courses: any[]) {
      const db = readDb()
      db.courses = courses
      writeDb(db)
    },
    getProgress() {
      const db = readDb()
      return db.progress || []
    },
    setProgress(progress: any[]) {
      const db = readDb()
      db.progress = progress
      writeDb(db)
    },
    getAssignments() {
      const db = readDb()
      return db.assignments || []
    },
    setAssignments(assignments: any[]) {
      const db = readDb()
      db.assignments = assignments
      writeDb(db)
    },
    getCalls() {
      const db = readDb()
      return db.calls || []
    },
    setCalls(calls: any[]) {
      const db = readDb()
      db.calls = calls
      writeDb(db)
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
} else {
  serverImpl = clientDB
}

export const serverDB = serverImpl
