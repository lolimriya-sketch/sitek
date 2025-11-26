// Simple smoke test that checks a few API endpoints on localhost:3000
// Usage: pnpm smoke
const base = process.env.SMOKE_BASE || 'http://localhost:3000'
const endpoints = ['/api/db', '/api/users', '/api/courses', '/api/progress']

;(async () => {
  console.log('Running smoke tests against', base)
  let failed = false
  for (const ep of endpoints) {
    try {
      const res = await fetch(base + ep)
      if (!res.ok) {
        console.error(`${ep} -> HTTP ${res.status}`)
        failed = true
        continue
      }
      const json = await res.json()
      console.log(`${ep} -> OK (${Array.isArray(json) ? json.length + ' items' : Object.keys(json).length + ' keys'})`)
    } catch (err) {
      console.error(`${ep} -> Error:`, err.message || err)
      failed = true
    }
  }
  if (!failed) {
    console.log('Smoke tests passed')
    process.exitCode = 0
  } else {
    console.error('Smoke tests failed')
    process.exitCode = 2
  }
})()
