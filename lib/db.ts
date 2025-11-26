// Unified database layer that works both on client and server
// On client: uses localStorage
// On server: uses data passed from client via API

// Use require to avoid missing type declarations for better-sqlite3 in this repo
let Database: any = null
try {
  // try to load native module; if it fails (missing bindings) we'll fall back to JSON
  Database = require('better-sqlite3')
} catch (e) {
  // eslint-disable-next-line no-console
  console.warn('[lib/db] better-sqlite3 not available, falling back to JSON file DB:', (e as any)?.message || String(e))
}
import path from 'path'

const DB_DIR = path.join(process.cwd(), 'data')
const DB_FILE = path.join(DB_DIR, 'site_lms.sqlite')

function openDb() {
  // ensure data dir exists
  try {
    // eslint-disable-next-line node/no-sync
    require('fs').mkdirSync(DB_DIR, { recursive: true })
  } catch {}
  if (!Database) return null

  try {
    const db = new Database(DB_FILE)

    // initialize schema
    db.exec(
      `
    CREATE TABLE IF NOT EXISTS items (
      type TEXT NOT NULL,
      id TEXT NOT NULL PRIMARY KEY,
      data TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_items_type ON items(type);
  `,
    )

    return db
  } catch (e) {
    // if native binding fails at runtime, fall back to JSON DB
    // eslint-disable-next-line no-console
    console.warn('[lib/db] better-sqlite3 failed to initialize, falling back to JSON DB:', (e as any)?.message || String(e))
    return null
  }
}

const _db = openDb()

function readAll(type: string) {
  if (!_db) {
    // fallback to JSON file
    try {
      const fs = require('fs')
      const raw = fs.readFileSync(path.join(process.cwd(), 'data', 'db.json'), 'utf-8')
      const parsed = JSON.parse(raw || '{}')
      return parsed[type] || []
    } catch (e) {
      return []
    }
  }

  const stmt = _db.prepare('SELECT data FROM items WHERE type = ?')
  const rows = stmt.all(type)
  return rows.map((r: any) => JSON.parse(r.data))
}

function overwriteAll(type: string, items: any[]) {
  if (!_db) {
    try {
      const fs = require('fs')
      const dbPath = path.join(process.cwd(), 'data', 'db.json')
      let parsed: any = {}
      try {
        const raw = fs.readFileSync(dbPath, 'utf-8')
        parsed = JSON.parse(raw || '{}')
      } catch {}
      parsed[type] = items
      fs.writeFileSync(dbPath, JSON.stringify(parsed, null, 2), 'utf-8')
      return
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[lib/db] failed to write JSON DB:', (e as any)?.message || String(e))
      return
    }
  }

  const del = _db.prepare('DELETE FROM items WHERE type = ?')
  const insert = _db.prepare('INSERT INTO items (type,id,data) VALUES (@type,@id,@data)')
  const insertMany = _db.transaction((rows: any[]) => {
    del.run(type)
    for (const it of rows) {
      insert.run({ type, id: String(it.id), data: JSON.stringify(it) })
    }
  })
  insertMany(items)
}

export const serverDB = {
  getUsers(): any[] {
    return readAll('users')
  },
  setUsers(users: any[]) {
    overwriteAll('users', users)
  },
  getCourses(): any[] {
    return readAll('courses')
  },
  setCourses(courses: any[]) {
    overwriteAll('courses', courses)
  },
  getProgress(): any[] {
    return readAll('progress')
  },
  setProgress(progress: any[]) {
    overwriteAll('progress', progress)
  },
  getAssignments(): any[] {
    return readAll('assignments')
  },
  setAssignments(assignments: any[]) {
    overwriteAll('assignments', assignments)
  },
  getCalls(): any[] {
    return readAll('calls')
  },
  setCalls(calls: any[]) {
    overwriteAll('calls', calls)
  },
  initializeDefaultAdmin() {
    const users = readAll('users')
    if (!users || users.length === 0) {
      const admin = {
        id: 'admin-1',
        email: 'admin@system.com',
        name: 'Головний Адміністратор',
        role: 'admin',
        password: 'admin123',
        createdAt: new Date().toISOString(),
      }
      overwriteAll('users', [admin])
    }
  },
}

// clientDB keeps the same API as before. On server it proxies to serverDB.
export const clientDB: any = (() => {
  if (typeof window === 'undefined') return serverDB

  return {
    async getUsers() {
      const res = await fetch('/api/users')
      return res.json()
    },
    async setUsers(users: any[]) {
      await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users }),
      })
    },
    async getCourses() {
      const res = await fetch('/api/courses')
      return res.json()
    },
    async setCourses(courses: any[]) {
      await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courses }),
      })
    },
    async getProgress() {
      const res = await fetch('/api/progress')
      return res.json()
    },
    async setProgress(progress: any[]) {
      await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progress }),
      })
    },
    async getAssignments() {
      const res = await fetch('/api/db')
      const data = await res.json()
      return data.assignments || []
    },
    async setAssignments(assignments: any[]) {
      await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignments }),
      })
    },
    async getCalls() {
      const res = await fetch('/api/db')
      const data = await res.json()
      return data.calls || []
    },
    async setCalls(calls: any[]) {
      await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ calls }),
      })
    },
    initializeDefaultAdmin() {
      return
    },
  }
})()

