"use client"

import type React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import type { Course, CourseScene, SceneElement } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card } from "@/components/ui/card"
import {
  Type,
  ImageIcon,
  Video,
  MousePointer,
  ArrowRight,
  Info,
  Save,
  ArrowLeft,
  Trash2,
  Plus,
  Upload,
  Target,
  FileText,
  Presentation,
  Download,
} from "lucide-react"
import ArrowIcon from "@/components/arrow-icon"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface CourseEditorProps {
  course: Course
}

type ElementType =
  | "text"
  | "image"
  | "video"
  | "clickzone"
  | "arrow"
  | "tooltip"
  | "hotspot"
  | "button"
  | "input"
  | "presentation"

/**
 * SIMPLIFIED COURSE EDITOR V2
 * 
 * Key principles:
 * 1. Canvas dimensions are fixed when background image loads (using natural width/height)
 * 2. Elements are always stored in px in the React state (in memory)
 * 3. When saving to DB: convert px → percent relative to natural image dims
 * 4. When loading from DB: convert percent → px using natural image dims
 * 5. No percent fields in React state → prevents infinite loops and confusion
 */
export function CourseEditor({ course: initialCourse }: CourseEditorProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [course, setCourse] = useState(initialCourse)
  const [saving, setSaving] = useState(false)
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0)
  const [selectedElement, setSelectedElement] = useState<string | null>(null)
  const [draggedElement, setDraggedElement] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mediaInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  
  // Canvas fixed dimensions (set when bg image loads)
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number } | null>(null)
  const [visibleRows, setVisibleRows] = useState<Set<number>>(new Set([1, 2, 3]))
  
  // Track which scenes have had their percent→px conversion done (one-time only)
  const [scenesLoadedRef] = useState<Set<string>>(new Set())

  const currentScene = course?.scenes?.[currentSceneIndex]

  // ============================================================================
  // HELPER: Convert elements from DB format (percent-based) to px (for editing)
  // ============================================================================
  const convertElementsPercentToPx = useCallback((
    elements: SceneElement[],
    naturalWidth: number,
    naturalHeight: number
  ): SceneElement[] => {
    return elements.map((el) => {
      const posPerc = (el as any).positionPercent
      const sizePerc = (el as any).sizePercent

      if (posPerc || sizePerc) {
        // Convert percent to px
        return {
          ...el,
          position: {
            x: Math.round((posPerc?.x || 0) * naturalWidth / 100),
            y: Math.round((posPerc?.y || 0) * naturalHeight / 100),
          },
          size: {
            width: Math.round((sizePerc?.width || 100) * naturalWidth / 100),
            height: Math.round((sizePerc?.height || 100) * naturalHeight / 100),
          },
        } as SceneElement
      }
      return el
    })
  }, [])

  // ============================================================================
  // Initialize scene from DB (convert percent→px one time on mount)
  // ============================================================================
  useEffect(() => {
    if (!currentScene) return
    if (scenesLoadedRef.has(currentScene.id)) return // Already converted

    // Get natural dims
    const naturalWidth = (currentScene as any).screenshotNaturalWidth || 800
    const naturalHeight = (currentScene as any).screenshotNaturalHeight || 600

    // Check if scene has percent fields (from DB)
    const hasPercent = currentScene.elements.some((el) => (el as any).positionPercent || (el as any).sizePercent)

    if (hasPercent) {
      const converted = convertElementsPercentToPx(currentScene.elements, naturalWidth, naturalHeight)
      updateScene(currentSceneIndex, { elements: converted })
      scenesLoadedRef.add(currentScene.id)
    } else if (!currentScene.elements.some((el) => el.position)) {
      // Fallback: ensure all elements have px positions
      scenesLoadedRef.add(currentScene.id)
    }
  }, [currentScene, currentSceneIndex, convertElementsPercentToPx])

  // ============================================================================
  // Background image load handler
  // ============================================================================
  const handleBackgroundImageLoad = useCallback((img: HTMLImageElement) => {
    const naturalW = img.naturalWidth || 800
    const naturalH = img.naturalHeight || 600

    // Set canvas to natural image dimensions (this is THE canonical size)
    setCanvasSize({ width: naturalW, height: naturalH })

    // Store natural dimensions on scene for later reference
    updateScene(currentSceneIndex, {
      screenshotNaturalWidth: naturalW,
      screenshotNaturalHeight: naturalH,
    } as any)

    console.debug("[CourseEditor] Background loaded", { naturalW, naturalH })
  }, [currentSceneIndex])

  // ============================================================================
  // Save to DB
  // ============================================================================
  const handleSave = useCallback(async () => {
    if (!course || !currentScene) return
    setSaving(true)

    try {
      // Get canvas dims
      const naturalW = (currentScene as any).screenshotNaturalWidth || canvasSize?.width || 800
      const naturalH = (currentScene as any).screenshotNaturalHeight || canvasSize?.height || 600

      // Convert all scenes: px → percent
      const scenesForSave = course.scenes.map((scene) => ({
        ...scene,
        elements: scene.elements.map((el) => {
          const pos = el.position || { x: 0, y: 0 }
          const size = el.size || { width: 100, height: 100 }

          return {
            ...el,
            positionPercent: {
              x: Math.round((pos.x / naturalW) * 100),
              y: Math.round((pos.y / naturalH) * 100),
            },
            sizePercent: {
              width: Math.round((size.width / naturalW) * 100),
              height: Math.round((size.height / naturalH) * 100),
            },
            // Remove px fields from saved data
            position: undefined,
            size: undefined,
          } as any)
        }),
      }))

      const res = await fetch("/api/courses", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: course.id, updates: { ...course, scenes: scenesForSave } }),
      })

      if (res.ok) {
        toast({ title: "Успіх", description: "Курс збережено" })
        router.refresh()
      } else {
        const result = await res.json()
        toast({ variant: "destructive", title: "Помилка", description: result.error || "Помилка збереження" })
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Помилка", description: String(err) })
    } finally {
      setSaving(false)
    }
  }, [course, currentScene, canvasSize, currentSceneIndex, toast, router, setSaving])

  // ============================================================================
  // Scene management
  // ============================================================================
  const addScene = useCallback(() => {
    if (!course) return
    const currentScenes = Array.isArray(course.scenes) ? course.scenes : []
    const nextIndex = currentScenes.length

    const newScene: CourseScene = {
      id: `scene-${Date.now()}`,
      name: `Сцена ${nextIndex + 1}`,
      elements: [],
    }

    setCourse({ ...course, scenes: [...currentScenes, newScene] })
    setCurrentSceneIndex(nextIndex)
  }, [course])

  const deleteScene = useCallback((index: number) => {
    if (!course) return
    if (course.scenes.length === 1) {
      toast({
        variant: "destructive",
        title: "Помилка",
        description: "Не можна видалити останню сцену",
      })
      return
    }

    const newScenes = course.scenes.filter((_, i) => i !== index)
    setCourse({ ...course, scenes: newScenes })
    if (currentSceneIndex >= newScenes.length) {
      setCurrentSceneIndex(newScenes.length - 1)
    }
  }, [course, currentSceneIndex, toast])

  const updateScene = useCallback((index: number, updates: Partial<CourseScene>) => {
    setCourse((prev) => {
      if (!prev) return prev
      const newScenes = [...prev.scenes]
      newScenes[index] = { ...newScenes[index], ...updates }
      return { ...prev, scenes: newScenes }
    })
  }, [])

  // ============================================================================
  // Element management
  // ============================================================================
  const updateElement = useCallback((elementId: string, updates: Partial<SceneElement>) => {
    if (!currentScene) return
    const newElements = currentScene.elements.map((el) => (el.id === elementId ? { ...el, ...updates } : el))
    updateScene(currentSceneIndex, { elements: newElements })
  }, [currentScene, currentSceneIndex, updateScene])

  const clampToCanvas = useCallback((
    x: number,
    y: number,
    width: number,
    height: number,
    canvasW: number,
    canvasH: number
  ) => {
    const w = Math.min(width, canvasW)
    const h = Math.min(height, canvasH)
    const maxX = Math.max(0, canvasW - w)
    const maxY = Math.max(0, canvasH - h)
    const nx = Math.min(Math.max(0, x), maxX)
    const ny = Math.min(Math.max(0, y), maxY)
    return { x: nx, y: ny, width: w, height: h }
  }, [])

  const addElement = useCallback((type: ElementType) => {
    if (!currentScene || !canvasSize) return

    const newElement: SceneElement = {
      id: `element-${Date.now()}`,
      type,
      data: { ...getDefaultData(type), row: 1 },
      position: { x: 50, y: 50 },
      size: {
        width: type === "hotspot" ? 80 : type === "input" ? 300 : 200,
        height: type === "hotspot" ? 80 : type === "input" ? 40 : 150,
      },
      rotation: type === "arrow" ? 0 : undefined,
    }

    // Clamp to canvas
    const clamped = clampToCanvas(
      newElement.position.x,
      newElement.position.y,
      newElement.size.width,
      newElement.size.height,
      canvasSize.width,
      canvasSize.height
    )

    newElement.position = { x: clamped.x, y: clamped.y }
    newElement.size = { width: clamped.width, height: clamped.height }

    updateScene(currentSceneIndex, {
      elements: [...currentScene.elements, newElement],
    })
    setSelectedElement(newElement.id)
  }, [currentScene, canvasSize, currentSceneIndex, updateScene, clampToCanvas])

  const deleteElement = useCallback((elementId: string) => {
    if (!currentScene) return
    updateScene(currentSceneIndex, {
      elements: currentScene.elements.filter((el) => el.id !== elementId),
    })
    setSelectedElement(null)
  }, [currentScene, currentSceneIndex, updateScene])

  // ============================================================================
  // File uploads
  // ============================================================================
  const handleScreenshotUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target?.result as string
      // Reset canvasSize so onLoad recalcs from new image
      setCanvasSize(null)
      updateScene(currentSceneIndex, { screenshot: base64 })
      toast({ title: "Успіх", description: "Скріншот завантажено" })
    }
    reader.readAsDataURL(file)
  }, [currentSceneIndex, updateScene, toast])

  const handleMediaUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>, elementId: string) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target?.result as string
      const element = currentScene?.elements.find((el) => el.id === elementId)

      if (!element) return

      if (element.type === "image") {
        updateElement(elementId, { data: { ...element.data, url: base64 } })

        // Adjust element size to match image aspect ratio
        const img = new Image()
        img.onload = () => {
          if (!canvasSize) return
          const naturalW = img.naturalWidth
          const naturalH = img.naturalHeight
          const scale = Math.min(canvasSize.width / naturalW, canvasSize.height / naturalH, 1)
          const targetW = Math.round(naturalW * scale)
          const targetH = Math.round(naturalH * scale)

          const pos = element.position || { x: 0, y: 0 }
          const clamped = clampToCanvas(pos.x, pos.y, targetW, targetH, canvasSize.width, canvasSize.height)
          updateElement(elementId, { size: { width: clamped.width, height: clamped.height }, position: { x: clamped.x, y: clamped.y } })
        }
        img.src = base64
      } else if (element.type === "video") {
        updateElement(elementId, { data: { ...element.data, url: base64 } })
      } else if (element.type === "presentation") {
        updateElement(elementId, { data: { ...element.data, url: base64, fileName: file.name } })
      }

      toast({ title: "Успіх", description: "Файл завантажено" })
    }
    reader.readAsDataURL(file)
  }, [currentScene, canvasSize, updateElement, clampToCanvas, toast])

  // ============================================================================
  // Dragging
  // ============================================================================
  const handlePointerDown = useCallback((e: React.PointerEvent, elementId: string) => {
    e.stopPropagation()
    if (!canvasSize) return

    const element = currentScene?.elements.find((el) => el.id === elementId)
    if (!element) return

    const rect = canvasRef.current?.getBoundingClientRect()
    const left = element.position?.x || 0
    const top = element.position?.y || 0

    setDraggedElement(elementId)
    setSelectedElement(elementId)
    setDragOffset({
      x: e.clientX - (rect?.left || 0) - left,
      y: e.clientY - (rect?.top || 0) - top,
    })

    try {
      (e.currentTarget as Element).setPointerCapture?.(e.pointerId)
    } catch (err) {
      // ignore
    }
  }, [currentScene, canvasSize])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!draggedElement || !canvasRef.current || !canvasSize) return

    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left - dragOffset.x
    const y = e.clientY - rect.top - dragOffset.y

    const el = currentScene?.elements.find((el) => el.id === draggedElement)
    const width = el?.size?.width || 0
    const height = el?.size?.height || 0

    const clamped = clampToCanvas(x, y, width, height, canvasSize.width, canvasSize.height)
    updateElement(draggedElement, { position: { x: clamped.x, y: clamped.y } })
  }, [draggedElement, dragOffset, currentScene, canvasSize, updateElement, clampToCanvas])

  const handlePointerUp = useCallback((e?: React.PointerEvent) => {
    setDraggedElement(null)
    try {
      if (e) (e.currentTarget as Element).releasePointerCapture?.(e.pointerId)
    } catch (err) {
      // ignore
    }
  }, [])

  // ============================================================================
  // Rendering helpers
  // ============================================================================
  const getDefaultData = (type: ElementType) => {
    switch (type) {
      case "text":
        return { text: "Текст", fontSize: 16, color: "#000000", backgroundColor: "#ffffff" }
      case "image":
        return { url: "/placeholder.svg?height=150&width=200", alt: "Зображення" }
      case "video":
        return { url: "", autoplay: false }
      case "clickzone":
        return { label: "Клікніть", action: "next-scene" }
      case "button":
        return { label: "Наступна сцена", action: "next-scene", targetScene: "", backgroundColor: "#3b82f6", textColor: "#ffffff" }
      case "input":
        return { placeholder: "Введіть текст...", label: "Поле вводу", required: false, multiline: false }
      case "arrow":
        return { color: "#3b82f6", thickness: 4 }
      case "tooltip":
        return { text: "Підказка", backgroundColor: "#1f2937", textColor: "#ffffff", tooltipTrigger: "hover" }
      case "hotspot":
        return { label: "Точка", pulseColor: "#ef4444", action: "show-tooltip", tooltipText: "Натисніть тут", tooltipTrigger: "click" }
      case "presentation":
        return { url: "", fileName: "Презентація", type: "pdf" }
      default:
        return {}
    }
  }

  const getElementPx = (el?: SceneElement) => {
    if (!el) return { left: 0, top: 0, width: 0, height: 0 }
    return {
      left: el.position?.x ?? 0,
      top: el.position?.y ?? 0,
      width: el.size?.width ?? 0,
      height: el.size?.height ?? 0,
    }
  }

  const elementTypes = [
    { value: "text", label: "Текст", icon: Type },
    { value: "image", label: "Зображення", icon: ImageIcon },
    { value: "video", label: "Відео", icon: Video },
    { value: "button", label: "Кнопка переходу", icon: MousePointer },
    { value: "input", label: "Поле вводу", icon: FileText },
    { value: "presentation", label: "Презентація", icon: Presentation },
    
    { value: "arrow", label: "Стрілка", icon: ArrowRight },
    { value: "tooltip", label: "Підказка", icon: Info },
  ]

  const selectedElementData = currentScene?.elements.find((el) => el.id === selectedElement)

  const renderedElements = currentScene && canvasSize
    ? currentScene.elements
        .filter((el) => visibleRows.has((el.data as any)?.row || 1))
        .map((element, idx) => {
          const left = element.position?.x || 0
          const top = element.position?.y || 0
          const width = element.size?.width || 0
          const height = element.size?.height || 0

          return (
            <div
              key={element.id}
              className={`absolute border-2 transition-colors ${
                selectedElement === element.id ? "border-primary" : "border-dashed border-primary/30"
              }`}
              style={{
                left: `${left}px`,
                top: `${top}px`,
                width: `${width}px`,
                height: `${height}px`,
                cursor: draggedElement === element.id ? "grabbing" : "grab",
                transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
              }}
              onPointerDown={(e) => handlePointerDown(e, element.id)}
              onTouchStart={(e) => handlePointerDown(e as unknown as React.PointerEvent, element.id)}
              onDragStart={(e) => e.preventDefault()}
              onClick={(e) => {
                e.stopPropagation()
                setSelectedElement(element.id)
              }}
            >
              {/* Element preview */}
              {element.type === "text" && (
                <div
                  className="w-full h-full p-2 overflow-hidden pointer-events-none"
                  style={{
                    fontSize: `${element.data.fontSize}px`,
                    color: element.data.color,
                    backgroundColor: element.data.backgroundColor,
                  }}
                >
                  {element.data.text}
                </div>
              )}

              {element.type === "image" && element.data.url && (
                <img
                  src={element.data.url || "/placeholder.svg"}
                  alt=""
                  className="w-full h-full object-contain pointer-events-none"
                  style={{ objectPosition: "center" }}
                />
              )}

              {element.type === "button" && (
                <div
                  className="w-full h-full flex items-center justify-center rounded font-medium pointer-events-none"
                  style={{ backgroundColor: element.data.backgroundColor, color: element.data.textColor }}
                >
                  {element.data.label}
                </div>
              )}

              {element.type === "input" && (
                <div className="w-full h-full bg-white border-2 border-gray-300 rounded px-3 py-2 pointer-events-none">
                  <span className="text-sm text-gray-400">{element.data.placeholder}</span>
                </div>
              )}

              {element.type === "presentation" && (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 border-2 border-gray-300 rounded pointer-events-none">
                  <Presentation className="h-8 w-8 text-gray-500 mb-2" />
                  <span className="text-xs text-gray-600">{element.data.fileName || "Презентація"}</span>
                </div>
              )}

              {element.type === "hotspot" && (
                <div
                  className="w-full h-full rounded-full flex items-center justify-center animate-pulse pointer-events-none"
                  style={{ backgroundColor: element.data.pulseColor + "40" }}
                >
                  <Target className="h-6 w-6" style={{ color: element.data.pulseColor }} />
                </div>
              )}

              {element.type === "arrow" && (
                <div className="w-full h-full flex items-center justify-center pointer-events-none">
                  <ArrowIcon className="h-8 w-8" color={element.data.color} thickness={element.data.thickness} />
                </div>
              )}

              {element.type === "tooltip" && (
                <div
                  className="w-full h-full p-2 rounded text-xs pointer-events-none"
                  style={{ backgroundColor: element.data.backgroundColor, color: element.data.textColor }}
                >
                  {element.data.text}
                </div>
              )}
            </div>
          )
        })
    : []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/courses">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Конструктор курсу</h1>
            <p className="text-muted-foreground mt-1">{course.title}</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? "Збереження..." : "Зберегти"}
        </Button>
      </div>

      <Tabs defaultValue="editor" className="w-full">
        <TabsList>
          <TabsTrigger value="editor">Редактор</TabsTrigger>
          <TabsTrigger value="settings">Налаштування</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-4">
          <Card className="p-6">
            <h3 className="font-semibold mb-4 text-lg">Інформація про курс</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="course-title">Назва курсу</Label>
                <Input
                  id="course-title"
                  value={course.title}
                  onChange={(e) => setCourse({ ...course, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="course-description">Опис курсу</Label>
                <Textarea
                  id="course-description"
                  value={course.description}
                  onChange={(e) => setCourse({ ...course, description: e.target.value })}
                  rows={4}
                />
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="editor" className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-4">
            {/* Left sidebar - Scenes */}
            <div className="lg:col-span-1 space-y-4">
              <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Сцени ({course?.scenes?.length ?? 0})</h3>
                  <Button size="sm" onClick={addScene} className="gap-1">
                    <Plus className="h-3 w-3" />
                    Додати
                  </Button>
                </div>
                <div className="space-y-2">
                  {course?.scenes?.map((scene, index) => (
                    <div
                      key={scene.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        currentSceneIndex === index
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                      onClick={() => setCurrentSceneIndex(index)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{scene.name}</span>
                        {(course?.scenes?.length ?? 0) > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteScene(index)
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{scene.elements.length} елементів</p>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-4">
                <h3 className="font-semibold mb-4">Додати елемент</h3>
                <div className="grid grid-cols-1 gap-2">
                  {elementTypes.map((type) => {
                    const Icon = type.icon
                    return (
                      <Button
                        key={type.value}
                        variant="outline"
                        size="sm"
                        onClick={() => addElement(type.value as ElementType)}
                        className="gap-2 justify-start"
                      >
                        <Icon className="h-3 w-3" />
                        <span className="text-xs">{type.label}</span>
                      </Button>
                    )
                  })}
                </div>
              </Card>
            </div>

            {/* Center - Canvas */}
            <div className="lg:col-span-2">
              <Card className="p-0 overflow-hidden">
                {currentScene && (
                  <>
                    <div className="flex items-center justify-between mb-4 p-4 pb-0 flex-wrap gap-4">
                      <Input
                        value={currentScene.name}
                        onChange={(e) => updateScene(currentSceneIndex, { name: e.target.value })}
                        className="max-w-xs"
                      />

                      <div className="flex gap-2">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleScreenshotUpload}
                          className="hidden"
                        />
                        {/* Screenshot upload button removed per UX request */}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Ряд:</span>
                        {[1, 2, 3].map((r) => (
                          <label key={r} className="inline-flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={visibleRows.has(r)}
                              onChange={(e) => {
                                const next = new Set(visibleRows)
                                if (e.target.checked) next.add(r)
                                else next.delete(r)
                                setVisibleRows(next)
                              }}
                            />
                            <span>{r}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div
                      ref={canvasRef}
                      className="relative bg-muted rounded-lg overflow-auto cursor-crosshair"
                      style={{
                        width: canvasSize ? `${canvasSize.width}px` : "100%",
                        height: canvasSize ? `${canvasSize.height}px` : "600px",
                        minHeight: "400px",
                      }}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      onPointerLeave={handlePointerUp}
                    >
                      {currentScene.screenshot && (
                        <img
                          src={currentScene.screenshot}
                          alt="Scene background"
                          onLoad={(e) => handleBackgroundImageLoad(e.currentTarget)}
                          className="absolute left-0 top-0 pointer-events-none"
                          style={{
                            width: canvasSize ? `${canvasSize.width}px` : "100%",
                            height: canvasSize ? `${canvasSize.height}px` : "100%",
                            objectFit: "contain",
                            objectPosition: "center",
                          }}
                        />
                      )}

                      {/* Render elements */}
                      {renderedElements}
                    </div>
                  </>
                )}
              </Card>
            </div>

            {/* Right sidebar - Element properties */}
            <div className="lg:col-span-1">
              <Card className="p-4">
                <h3 className="font-semibold mb-4">Властивості елемента</h3>
                {selectedElementData ? (
                  <div className="space-y-4 max-h-[600px] overflow-y-auto">
                    <div className="space-y-2">
                      <Label>Позиція X</Label>
                      <Input
                        type="number"
                        value={getElementPx(selectedElementData).left}
                        onChange={(e) =>
                          updateElement(selectedElement!, {
                            position: { ...selectedElementData.position, x: Number.parseInt(e.target.value) || 0 },
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Позиція Y</Label>
                      <Input
                        type="number"
                        value={getElementPx(selectedElementData).top}
                        onChange={(e) =>
                          updateElement(selectedElement!, {
                            position: { ...selectedElementData.position, y: Number.parseInt(e.target.value) || 0 },
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Ряд (layer)</Label>
                      <Select
                        value={String((selectedElementData.data as any)?.row || 1)}
                        onValueChange={(value) =>
                          updateElement(selectedElement!, {
                            data: { ...selectedElementData.data, row: Number.parseInt(value) },
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1</SelectItem>
                          <SelectItem value="2">2</SelectItem>
                          <SelectItem value="3">3</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Ширина</Label>
                      <Input
                        type="number"
                        value={getElementPx(selectedElementData).width}
                        onChange={(e) =>
                          updateElement(selectedElement!, {
                            size: { ...selectedElementData.size, width: Number.parseInt(e.target.value) || 0 },
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Висота</Label>
                      <Input
                        type="number"
                        value={getElementPx(selectedElementData).height}
                        onChange={(e) =>
                          updateElement(selectedElement!, {
                            size: { ...selectedElementData.size, height: Number.parseInt(e.target.value) || 0 },
                          })
                        }
                      />
                    </div>

                    {selectedElementData.type === "arrow" && (
                      <>
                        <div className="space-y-2">
                          <Label>Поворот (градуси)</Label>
                          <Input
                            type="number"
                            value={selectedElementData.rotation || 0}
                            onChange={(e) =>
                              updateElement(selectedElement!, {
                                rotation: Number.parseInt(e.target.value) || 0,
                              })
                            }
                            min="0"
                            max="360"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Колір</Label>
                          <Input
                            type="color"
                            value={selectedElementData.data.color}
                            onChange={(e) =>
                              updateElement(selectedElement!, {
                                data: { ...selectedElementData.data, color: e.target.value },
                              })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Товщина</Label>
                          <Input
                            type="number"
                            value={selectedElementData.data.thickness}
                            onChange={(e) =>
                              updateElement(selectedElement!, {
                                data: { ...selectedElementData.data, thickness: Number.parseInt(e.target.value) || 2 },
                              })
                            }
                            min="1"
                            max="10"
                          />
                        </div>
                      </>
                    )}

                    {selectedElementData.type === "text" && (
                      <>
                        <div className="space-y-2">
                          <Label>Текст</Label>
                          <Textarea
                            value={selectedElementData.data.text}
                            onChange={(e) =>
                              updateElement(selectedElement!, {
                                data: { ...selectedElementData.data, text: e.target.value },
                              })
                            }
                            rows={3}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Розмір шрифту</Label>
                          <Input
                            type="number"
                            value={selectedElementData.data.fontSize}
                            onChange={(e) =>
                              updateElement(selectedElement!, {
                                data: { ...selectedElementData.data, fontSize: Number.parseInt(e.target.value) || 16 },
                              })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Колір тексту</Label>
                          <Input
                            type="color"
                            value={selectedElementData.data.color}
                            onChange={(e) =>
                              updateElement(selectedElement!, {
                                data: { ...selectedElementData.data, color: e.target.value },
                              })
                            }
                          />
                        </div>
                      </>
                    )}

                    {selectedElementData.type === "button" && (
                      <>
                        <div className="space-y-2">
                          <Label>Текст кнопки</Label>
                          <Input
                            value={selectedElementData.data.label}
                            onChange={(e) =>
                              updateElement(selectedElement!, {
                                data: { ...selectedElementData.data, label: e.target.value },
                              })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Колір фону</Label>
                          <Input
                            type="color"
                            value={selectedElementData.data.backgroundColor}
                            onChange={(e) =>
                              updateElement(selectedElement!, {
                                data: { ...selectedElementData.data, backgroundColor: e.target.value },
                              })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Колір тексту</Label>
                          <Input
                            type="color"
                            value={selectedElementData.data.textColor}
                            onChange={(e) =>
                              updateElement(selectedElement!, {
                                data: { ...selectedElementData.data, textColor: e.target.value },
                              })
                            }
                          />
                        </div>
                      </>
                    )}

                    {selectedElementData.type === "image" && (
                      <>
                        <input
                          ref={mediaInputRef}
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleMediaUpload(e, selectedElement!)}
                          className="hidden"
                        />
                        <Button size="sm" variant="outline" onClick={() => mediaInputRef.current?.click()} className="w-full gap-2">
                          <Upload className="h-3 w-3" />
                          Завантажити зображення
                        </Button>
                      </>
                    )}

                    {selectedElementData.type === "video" && (
                      <>
                        <div className="space-y-2">
                          <Label>URL відео</Label>
                          <Input
                            value={selectedElementData.data.url}
                            onChange={(e) =>
                              updateElement(selectedElement!, {
                                data: { ...selectedElementData.data, url: e.target.value },
                              })
                            }
                            placeholder="https://..."
                          />
                        </div>
                      </>
                    )}

                    {selectedElementData.type === "tooltip" && (
                      <>
                        <div className="space-y-2">
                          <Label>Текст підказки</Label>
                          <Textarea
                            value={selectedElementData.data.text}
                            onChange={(e) => updateElement(selectedElement!, { data: { ...selectedElementData.data, text: e.target.value } })}
                            rows={3}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Тригер підказки</Label>
                          <Select
                            value={(selectedElementData.data as any)?.tooltipTrigger || "hover"}
                            onValueChange={(value) => updateElement(selectedElement!, { data: { ...selectedElementData.data, tooltipTrigger: value } })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="hover">Наведіть (hover)</SelectItem>
                              <SelectItem value="click">Клік (click)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Колір фону</Label>
                          <Input type="color" value={selectedElementData.data.backgroundColor} onChange={(e) => updateElement(selectedElement!, { data: { ...selectedElementData.data, backgroundColor: e.target.value } })} />
                        </div>

                        <div className="space-y-2">
                          <Label>Колір тексту</Label>
                          <Input type="color" value={selectedElementData.data.textColor} onChange={(e) => updateElement(selectedElement!, { data: { ...selectedElementData.data, textColor: e.target.value } })} />
                        </div>
                      </>
                    )}

                    {selectedElementData.type === "hotspot" && (
                      <>
                        <div className="space-y-2">
                          <Label>Підказка при кліку</Label>
                          <Textarea value={selectedElementData.data.tooltipText} onChange={(e) => updateElement(selectedElement!, { data: { ...selectedElementData.data, tooltipText: e.target.value } })} rows={2} />
                        </div>
                        <div className="space-y-2">
                          <Label>Тригер підказки</Label>
                          <Select value={(selectedElementData.data as any)?.tooltipTrigger || "click"} onValueChange={(value) => updateElement(selectedElement!, { data: { ...selectedElementData.data, tooltipTrigger: value } })}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="hover">Наведіть (hover)</SelectItem>
                              <SelectItem value="click">Клік (click)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Колір імпульсу</Label>
                          <Input type="color" value={selectedElementData.data.pulseColor} onChange={(e) => updateElement(selectedElement!, { data: { ...selectedElementData.data, pulseColor: e.target.value } })} />
                        </div>
                      </>
                    )}

                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteElement(selectedElement!)}
                      className="w-full mt-4"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Видалити елемент
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Виберіть елемент для редагування</p>
                )}
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
