"use client"

import { useEffect } from "react"
import { storage } from "@/lib/storage"

export function StorageInitializer() {
  useEffect(() => {
    storage.initializeDefaultAdmin()
  }, [])

  return null
}
