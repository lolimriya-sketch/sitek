"use client"

import type React from "react"

import { useState, useRef } from "react"
import { useEffect } from "react"
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
  | "survey"

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
  const courseFileRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const bgImgRef = useRef<HTMLImageElement | null>(null)
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number } | null>(null)
  const [visibleRows, setVisibleRows] = useState<Set<number>>(new Set([1, 2, 3]))

  const currentScene = course?.scenes?.[currentSceneIndex]

  function addScene() {
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
  }

  async function handleSave() {
    if (!course) return
    setSaving(true)
    // Save scenes with px-only coordinates (no percent conversion)
    const scenesForSave = course.scenes.map((scene) => ({
      ...scene,
      elements: scene.elements.map((el) => ({
        ...el,
        position: el.position || { x: 0, y: 0 },
        size: el.size || { width: 0, height: 0 },
      })),
    }))

    try {
      // API expects { id, updates }
      const res = await fetch("/api/courses", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: course.id, updates: { ...course, scenes: scenesForSave } }),
      })
      const result = await res.json()
      if (res.ok) {
        router.refresh()
      } else {
        toast({ variant: "destructive", title: "Помилка", description: result.error || "Помилка збереження" })
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Помилка", description: String(err) })
    }
    setSaving(false)
  }

  async function handleCourseExport() {
    if (!course) return
    const dataStr = JSON.stringify(course, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `course-${course.id}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  function handleCourseFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const text = ev.target?.result as string
        const parsed = JSON.parse(text)

        // If array -> replace whole courses list
        if (Array.isArray(parsed)) {
          const res = await fetch('/api/courses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ courses: parsed }),
          })
          if (res.ok) {
            toast({ title: 'Успіх', description: 'Список курсів замінено' })
            router.refresh()
          } else {
            const err = await res.json()
            toast({ variant: 'destructive', title: 'Помилка', description: err.error || 'Не вдалося імпортувати' })
          }
          return
        }

        // single course object
        if (parsed.id) {
          // try update
          const putRes = await fetch('/api/courses', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: parsed.id, updates: parsed }),
          })
          if (putRes.ok) {
            toast({ title: 'Успіх', description: 'Курс оновлено' })
            router.refresh()
            return
          }
        }

        // create new course
        const postRes = await fetch('/api/courses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(parsed),
        })
        if (postRes.ok) {
          const body = await postRes.json()
          toast({ title: 'Успіх', description: 'Курс імпортовано' })
          router.refresh()
        } else {
          const err = await postRes.json()
          toast({ variant: 'destructive', title: 'Помилка', description: err.error || 'Не вдалося імпортувати' })
        }
      } catch (err: any) {
        toast({ variant: 'destructive', title: 'Помилка', description: String(err) })
      }
    }
    reader.readAsText(file)
    // reset input
    if (courseFileRef.current) courseFileRef.current.value = ''
  }

  function deleteScene(index: number) {
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
  }

  function handleScreenshotUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target?.result as string
      // when screenshot changes, reset canvasSize so onLoad will recalc
      setCanvasSize(null)
      updateScene(currentSceneIndex, { screenshot: base64 })
      toast({
        title: "Успіх",
        description: "Скріншот завантажено",
      })
    }
    reader.readAsDataURL(file)
  }

  function handleMediaUpload(e: React.ChangeEvent<HTMLInputElement>, elementId: string) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target?.result as string
      const element = currentScene?.elements.find((el) => el.id === elementId)

      if (element) {
        if (element.type === "image") {
          updateElement(elementId, { data: { ...element.data, url: base64 } })
        } else if (element.type === "video") {
          updateElement(elementId, { data: { ...element.data, url: base64 } })
        } else if (element.type === "presentation") {
          updateElement(elementId, { data: { ...element.data, url: base64, fileName: file.name } })
        }

        toast({
          title: "Успіх",
          description: "Файл завантажено",
        })
      }
    }
    reader.readAsDataURL(file)
  }

  function handleBackgroundImageLoad(img: HTMLImageElement) {
    // Use NATURAL image dimensions as the canonical base for percent calculations
    // This ensures coordinates are STABLE regardless of container size
    const naturalW = img.naturalWidth || 800
    const naturalH = img.naturalHeight || Math.round(naturalW * 0.6)
    
    // Set canvas size to natural dimensions (so 1% = 1 pixel in the image)
    setCanvasSize({ width: naturalW, height: naturalH })

    // store natural image dimensions on the scene
    try {
      updateScene(currentSceneIndex, { screenshotNaturalWidth: naturalW, screenshotNaturalHeight: naturalH } as any)
    } catch (err) {
      // ignore: best-effort metadata attach
    }

    // debug: print canvas size for diagnostics
    // eslint-disable-next-line no-console
    console.debug("[editor] handleBackgroundImageLoad", { courseId: course.id, naturalW, naturalH })

    // convert any percent-stored positions/sizes into px for editing (relative to natural dims)
    const scene = course.scenes[currentSceneIndex]
    if (!scene) return
    // No conversion needed - elements already have px coordinates
    updateScene(currentSceneIndex, { elements: scene.elements })
  }

  function updateScene(index: number, updates: Partial<CourseScene>) {
    if (!course) return
    const newScenes = [...course.scenes]
    newScenes[index] = { ...newScenes[index], ...updates }
    setCourse({ ...course, scenes: newScenes })
  }

  function addElement(type: ElementType) {
    if (!currentScene) return

    const newElement: SceneElement = {
      id: `element-${Date.now()}`,
      type,
      data: { ...getDefaultData(type), row: 1 },
      position: { x: 100, y: 100 },
      size: {
        width: type === "hotspot" ? 80 : type === "input" ? 300 : 200,
        height: type === "hotspot" ? 80 : type === "input" ? 40 : 150,
      },
      rotation: type === "arrow" ? 0 : undefined,
    }

    updateScene(currentSceneIndex, {
      elements: [...currentScene.elements, newElement],
    })
    setSelectedElement(newElement.id)
  }

  function getDefaultData(type: ElementType) {
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
        return {
          label: "Наступна сцена",
          action: "next-scene",
          targetScene: "",
          backgroundColor: "#3b82f6",
          textColor: "#ffffff",
          fontSize: 16,
        }
      case "input":
        return { placeholder: "Введіть текст...", label: "Поле вводу", required: false, multiline: false }
      case "arrow":
        return { color: "#3b82f6", thickness: 4 }
      case "tooltip":
        return { text: "Підказка", backgroundColor: "#1f2937", textColor: "#ffffff" }
      case "hotspot":
        return { label: "Точка", pulseColor: "#ef4444", action: "show-tooltip", tooltipText: "Натисніть тут" }
      case "presentation":
        return { url: "", fileName: "Презентація", type: "pdf" }
      case "survey":
        return {
          question: "Питання?",
          multiple: false,
          failOnWrong: true,
          choices: [
            { id: `c-${Date.now()}-1`, text: "Варіант 1", correct: true },
            { id: `c-${Date.now()}-2`, text: "Варіант 2", correct: false },
          ],
        }
      default:
        return {}
    }
  }

  function updateElement(elementId: string, updates: Partial<SceneElement>) {
    if (!currentScene) return

    const newElements = currentScene.elements.map((el) => (el.id === elementId ? { ...el, ...updates } : el))
    updateScene(currentSceneIndex, { elements: newElements })
  }

  function deleteElement(elementId: string) {
    if (!currentScene) return

    updateScene(currentSceneIndex, {
      elements: currentScene.elements.filter((el) => el.id !== elementId),
    })
    setSelectedElement(null)
  }

  function handleMouseDown(e: React.MouseEvent, elementId: string) {
    e.stopPropagation()
    const element = currentScene?.elements.find((el) => el.id === elementId)
    if (!element) return

    // compute current element left/top in px (respecting percent fields)
    const rect = canvasRef.current?.getBoundingClientRect()
    const canvasW = rect?.width || canvasSize?.width || 800
    const canvasH = rect?.height || canvasSize?.height || 600
    const posPerc = (element as any).positionPercent
    const sizePerc = (element as any).sizePercent
    const left = posPerc ? Math.round((posPerc.x / 100) * canvasW) : element.position.x
    const top = posPerc ? Math.round((posPerc.y / 100) * canvasH) : element.position.y

    setDraggedElement(elementId)
    setSelectedElement(elementId)
    // pointer offset within the element
    setDragOffset({
      x: e.clientX - (rect?.left || 0) - left,
      y: e.clientY - (rect?.top || 0) - top,
    })
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!draggedElement || !canvasRef.current) return

    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left - dragOffset.x
    const y = e.clientY - rect.top - dragOffset.y

    updateElement(draggedElement, {
      position: { x: Math.max(0, x), y: Math.max(0, y) },
    })
  }

  function handleMouseUp() {
    setDraggedElement(null)
  }

  const elementTypes = [
    { value: "text", label: "Текст", icon: Type },
    { value: "image", label: "Зображення", icon: ImageIcon },
    { value: "video", label: "Відео", icon: Video },
    { value: "button", label: "Кнопка переходу", icon: MousePointer },
    { value: "input", label: "Поле вводу", icon: FileText },
    { value: "presentation", label: "Презентація", icon: Presentation },
    { value: "survey", label: "Опитування", icon: Type },
    { value: "hotspot", label: "Hotspot", icon: Target },
    { value: "arrow", label: "Стрілка", icon: ArrowRight },
    { value: "tooltip", label: "Підказка", icon: Info },
  ]

  const selectedElementData = currentScene?.elements.find((el) => el.id === selectedElement)

  const renderedElements = currentScene
    ? currentScene.elements
        .filter((el) => visibleRows.has((el.data as any)?.row || 1))
        .map((element, idx) => {
          const rect = canvasRef.current?.getBoundingClientRect()
          const canvasW = rect?.width || canvasSize?.width || 800
          const canvasH = rect?.height || canvasSize?.height || 600

          // Determine displayed image rect inside canvas (account for object-fit: contain letterboxing)
          let imgLeft = 0
          let imgTop = 0
          let imgW = canvasW
          let imgH = canvasH
          try {
            const imgRect = bgImgRef.current?.getBoundingClientRect()
            if (imgRect && rect) {
              imgLeft = imgRect.left - rect.left
              imgTop = imgRect.top - rect.top
              imgW = imgRect.width
              imgH = imgRect.height
            }
          } catch (e) {
            // ignore measurement errors
          }
          // Map px into canvas coordinates, anchored to the displayed image rect
          const naturalW = (currentScene as any).screenshotNaturalWidth || canvasW
          const naturalH = (currentScene as any).screenshotNaturalHeight || canvasH

          const naturalLeft = (element.position as any)?.x || 0
          const naturalTop = (element.position as any)?.y || 0
          const naturalWidth = (element.size as any)?.width || 0
          const naturalHeight = (element.size as any)?.height || 0

          // Use uniform scale (min of both axes) to preserve aspect ratio and prevent distortion
          const scaleX = imgW / naturalW || 1
          const scaleY = imgH / naturalH || 1
          const scale = Math.min(scaleX, scaleY)

          const left = Math.round(imgLeft + naturalLeft * scale)
          const top = Math.round(imgTop + naturalTop * scale)
          const width = Math.round(naturalWidth * scale)
          const height = Math.round(naturalHeight * scale)

          // debug: log first element computed positions for diagnostics
          if (idx === 0) {
            // eslint-disable-next-line no-console
            console.debug("[editor] first element computed", { id: element.id, left, top, width, height, canvasW, canvasH })
          }

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
              onMouseDown={(e) => handleMouseDown(e, element.id)}
              onPointerDown={(e) => handleMouseDown(e as unknown as React.MouseEvent, element.id)}
              onTouchStart={(e) => handleMouseDown(e as unknown as React.MouseEvent, element.id)}
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
                    fontSize: `${Math.round(((element.data as any).fontSize || 16) * scale)}px`,
                    color: element.data.color,
                    backgroundColor: element.data.backgroundColor,
                  }}
                >
                  {element.data.text}
                </div>
              )}

              {element.type === "image" && element.data.url && (
                <>
                  <img src={element.data.url || "/placeholder.svg"} alt="" className="w-full h-full object-contain pointer-events-none" style={{ objectPosition: "center" }} />
                  
                  {/* Resize and fullscreen controls - visible when selected */}
                  {selectedElement === element.id && (
                    <div className="absolute inset-0 flex items-end justify-end p-2 bg-black/5 group pointer-events-auto">
                      {/* Resize handle */}
                      <div
                        className="w-6 h-6 bg-blue-500 hover:bg-blue-600 cursor-nwse-resize rounded-full"
                        onMouseDown={(e) => {
                          e.stopPropagation()
                          const startX = e.clientX
                          const startY = e.clientY
                          const startW = element.size?.width || 100
                          const startH = element.size?.height || 100
                          const startLeft = element.position?.x || 0
                          const startTop = element.position?.y || 0
                          
                          const handleMove = (moveEvent: MouseEvent) => {
                            const deltaX = moveEvent.clientX - startX
                            const deltaY = moveEvent.clientY - startY
                            const newW = Math.max(50, startW + deltaX)
                            const newH = Math.max(50, startH + deltaY)
                            updateElement(element.id, { size: { width: newW, height: newH } })
                          }
                          
                          const handleUp = () => {
                            document.removeEventListener("mousemove", handleMove)
                            document.removeEventListener("mouseup", handleUp)
                          }
                          
                          document.addEventListener("mousemove", handleMove)
                          document.addEventListener("mouseup", handleUp)
                        }}
                        title="Resize (drag)"
                      />
                    </div>
                  )}
                </>
              )}

              {element.type === "button" && (
                <div
                  className="w-full h-full flex items-center justify-center rounded font-medium pointer-events-none"
                  style={{
                    backgroundColor: element.data.backgroundColor,
                    color: element.data.textColor,
                    fontSize: `${Math.round(((element.data as any).fontSize || 16) * scale)}px`,
                    lineHeight: `${height}px`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {element.data.label}
                </div>
              )}

              {element.type === "input" && (
                <div
                  className="w-full h-full bg-white border-2 border-gray-300 rounded px-3 py-2 pointer-events-none"
                  style={{ fontSize: `${Math.round(((element.data as any).fontSize || 14) * scale)}px` }}
                >
                  <span className="text-sm text-gray-400">{element.data.placeholder}</span>
                </div>
              )}

              {element.type === "presentation" && (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 border-2 border-gray-300 rounded pointer-events-none" style={{ gap: '6px' }}>
                  <Presentation className="" style={{ width: Math.round(Math.min(width, height) * 0.5), height: Math.round(Math.min(width, height) * 0.5), color: '#9CA3AF' }} />
                  <span className="text-xs text-gray-600" style={{ fontSize: `${Math.max(10, Math.round(12 * scale))}px` }}>{element.data.fileName || "Презентація"}</span>
                </div>
              )}

              {element.type === "hotspot" && (
                <div className="w-full h-full rounded-full flex items-center justify-center animate-pulse pointer-events-none" style={{ backgroundColor: element.data.pulseColor + "40" }}>
                  <Target className="" style={{ width: Math.round(Math.min(width, height) * 0.6), height: Math.round(Math.min(width, height) * 0.6), color: element.data.pulseColor }} />
                </div>
              )}

              {element.type === "arrow" && (
                <div className="w-full h-full flex items-center justify-center pointer-events-none">
                  <div style={{ width: Math.round(Math.min(width, height) * 0.6), height: Math.round(Math.min(width, height) * 0.6) }}>
                    <ArrowIcon className="w-full h-full" color={element.data.color} thickness={element.data.thickness} />
                  </div>
                </div>
              )}

              {element.type === "tooltip" && (
                <div className="w-full h-full p-2 rounded text-xs pointer-events-none" style={{ backgroundColor: element.data.backgroundColor, color: element.data.textColor }}>
                  {element.data.text}
                </div>
              )}

              {element.type === "survey" && (
                <div className="w-full h-full p-3 bg-white rounded shadow-sm overflow-hidden pointer-events-none">
                  <p className="font-medium text-sm mb-2">{element.data.question}</p>
                  <div className="space-y-1 text-sm">
                    {(element.data.choices || []).slice(0, 4).map((ch: any) => (
                      <div key={ch.id} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-gray-200" />
                        <div className="truncate">{ch.text}</div>
                      </div>
                    ))}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">{element.data.multiple ? "Множинний вибір" : "Один вибір"}</div>
                </div>
              )}
            </div>
          )
        })
    : []


  function getElementPx(el?: SceneElement | undefined) {
    if (!el) return { left: 0, top: 0, width: 0, height: 0 }
    const rect = canvasRef.current?.getBoundingClientRect()
    const canvasW = rect?.width || canvasSize?.width || 800
    const canvasH = rect?.height || canvasSize?.height || 600
    // Use px fields directly (no percent)
    const left = (el.position as any)?.x ?? 0
    const top = (el.position as any)?.y ?? 0
    const width = (el.size as any)?.width ?? 0
    const height = (el.size as any)?.height ?? 0
    return { left, top, width, height }
  }

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
              <div className="mt-6 border-t pt-4">
                <h4 className="font-semibold mb-2">Експорт / Імпорт курсу</h4>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleCourseExport} className="gap-2">
                    <Download className="h-4 w-4" />
                    Експорт курсу
                  </Button>

                  <input
                    ref={courseFileRef}
                    type="file"
                    accept="application/json"
                    onChange={handleCourseFileChange}
                    className="hidden"
                  />

                  <Button variant="outline" size="sm" onClick={() => courseFileRef.current?.click()} className="gap-2">
                    <Upload className="h-4 w-4" />
                    Імпорт курсу (JSON)
                  </Button>
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
                    <div className="flex items-center justify-between mb-4 p-4 pb-0">
                      <Input
                        value={currentScene.name}
                        onChange={(e) => updateScene(currentSceneIndex, { name: e.target.value })}
                        className="max-w-xs"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          // Convert to percent-based positions for export (same as save logic)
                          const rect = canvasRef.current?.getBoundingClientRect()
                          const canvasW = rect?.width || canvasSize?.width || 800
                          const canvasH = rect?.height || canvasSize?.height || 600

                          const sceneLiteralForExport = {
                            // include natural screenshot dims if present so viewer can decode base64 correctly
                            ...currentScene,
                            screenshotNaturalWidth: (currentScene as any).screenshotNaturalWidth,
                            screenshotNaturalHeight: (currentScene as any).screenshotNaturalHeight,
                            elements: currentScene.elements.map((el) => {
                              const pos = el.position || { x: 0, y: 0 }
                              const size = el.size || { width: 0, height: 0 }
                              const positionPercent = { x: Math.round((pos.x / canvasW) * 100), y: Math.round((pos.y / canvasH) * 100) }
                              const sizePercent = { width: Math.round((size.width / canvasW) * 100), height: Math.round((size.height / canvasH) * 100) }
                              const cleaned = { ...el }
                              // store percent fields for export
                              ;(cleaned as any).positionPercent = positionPercent
                              ;(cleaned as any).sizePercent = sizePercent
                              // remove px fields to match save format
                              delete (cleaned as any).position
                              delete (cleaned as any).size
                              return cleaned
                            })
                          }

                          const dataStr = JSON.stringify(sceneLiteralForExport, null, 2)
                          const dataBlob = new Blob([dataStr], { type: 'application/json' })
                          const url = URL.createObjectURL(dataBlob)
                          const link = document.createElement('a')
                          link.href = url
                          link.download = `scene-${currentScene.id}.json`
                          link.click()
                          URL.revokeObjectURL(url)
                        }}
                        className="gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Експорт JSON
                      </Button>
                      <div className="flex gap-2">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleScreenshotUpload}
                          className="hidden"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          className="gap-2"
                        >
                          <Upload className="h-4 w-4" />
                          Завантажити скріншот
                        </Button>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
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
                      className="relative bg-muted rounded-lg overflow-auto cursor-crosshair"
                      style={{
                        minHeight: "500px",
                        maxHeight: "700px",
                      }}
                    >
                      <div
                        ref={canvasRef}
                        className="relative bg-muted cursor-crosshair inline-block"
                        style={{
                          width: canvasSize ? `${canvasSize.width}px` : "800px",
                          height: canvasSize ? `${canvasSize.height}px` : "600px",
                        }}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                      >
                      {currentScene.screenshot && (
                        <img
                          ref={bgImgRef}
                          src={currentScene.screenshot || "/placeholder.svg"}
                          alt="Scene background"
                          onLoad={(e) => {
                            handleBackgroundImageLoad(e.currentTarget)
                            // force re-render measurements
                            setTimeout(() => {
                              // no-op; ensures layout recalculation
                            }, 0)
                          }}
                          className="absolute left-0 top-0 w-full h-full pointer-events-none"
                          style={{ objectFit: "contain", objectPosition: "center" }}
                        />
                      )}

                      {/* Render elements */}
                      {renderedElements}
                    </div>
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
                            position: { ...(selectedElementData.position || { x: 0, y: 0 }), x: Number.parseInt(e.target.value) || 0 },
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
                            position: { ...(selectedElementData.position || { x: 0, y: 0 }), y: Number.parseInt(e.target.value) || 0 },
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
                            size: { ...(selectedElementData.size || { width: 0, height: 0 }), width: Number.parseInt(e.target.value) || 0 },
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
                            size: { ...(selectedElementData.size || { width: 0, height: 0 }), height: Number.parseInt(e.target.value) || 0 },
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
                          <p className="text-xs text-muted-foreground">
                            0° - вправо, 90° - вниз, 180° - вліво, 270° - вверх
                          </p>
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
                          <Label>Дія</Label>
                          <Select
                            value={selectedElementData.data.action}
                            onValueChange={(value) =>
                              updateElement(selectedElement!, {
                                data: { ...selectedElementData.data, action: value },
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="next-scene">Наступна сцена</SelectItem>
                              <SelectItem value="goto-scene">Перейти до сцени</SelectItem>
                              <SelectItem value="complete">Завершити курс</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {selectedElementData.data.action === "goto-scene" && (
                          <div className="space-y-2">
                            <Label>Цільова сцена</Label>
                            <Select
                              value={selectedElementData.data.targetScene}
                              onValueChange={(value) =>
                                updateElement(selectedElement!, {
                                  data: { ...selectedElementData.data, targetScene: value },
                                })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Оберіть сцену" />
                              </SelectTrigger>
                              <SelectContent>
                                {course?.scenes?.map((scene) => (
                                  <SelectItem key={scene.id} value={scene.id}>
                                    {scene.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        <div className="space-y-2">
                          <Label>Колір фону</Label>
                          <div className="flex items-center gap-3">
                            <label className="inline-flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={selectedElementData.data.backgroundColor === "transparent"}
                                onChange={(e) =>
                                  updateElement(selectedElement!, {
                                    data: {
                                      ...selectedElementData.data,
                                      backgroundColor: e.target.checked ? "transparent" : "#ffffff",
                                    },
                                  })
                                }
                              />
                              <span className="text-sm">Прозорий фон</span>
                            </label>

                            <Input
                              type="color"
                              value={selectedElementData.data.backgroundColor === "transparent" ? "#ffffff" : selectedElementData.data.backgroundColor}
                              onChange={(e) =>
                                updateElement(selectedElement!, {
                                  data: { ...selectedElementData.data, backgroundColor: e.target.value },
                                })
                              }
                              disabled={selectedElementData.data.backgroundColor === "transparent"}
                            />
                          </div>
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

                    {selectedElementData.type === "input" && (
                      <>
                        <div className="space-y-2">
                          <Label>Назва поля</Label>
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
                          <Label>Placeholder</Label>
                          <Input
                            value={selectedElementData.data.placeholder}
                            onChange={(e) =>
                              updateElement(selectedElement!, {
                                data: { ...selectedElementData.data, placeholder: e.target.value },
                              })
                            }
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="required"
                            checked={selectedElementData.data.required}
                            onChange={(e) =>
                              updateElement(selectedElement!, {
                                data: { ...selectedElementData.data, required: e.target.checked },
                              })
                            }
                          />
                          <Label htmlFor="required">Обов'язкове поле</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="multiline"
                            checked={selectedElementData.data.multiline}
                            onChange={(e) =>
                              updateElement(selectedElement!, {
                                data: { ...selectedElementData.data, multiline: e.target.checked },
                              })
                            }
                          />
                          <Label htmlFor="multiline">Багаторядкове</Label>
                        </div>
                      </>
                    )}

                    {selectedElementData.type === "presentation" && (
                      <>
                        <div className="space-y-2">
                          <Label>Назва файлу</Label>
                          <Input
                            value={selectedElementData.data.fileName}
                            onChange={(e) =>
                              updateElement(selectedElement!, {
                                data: { ...selectedElementData.data, fileName: e.target.value },
                              })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Завантажити файл</Label>
                          <input
                            ref={mediaInputRef}
                            type="file"
                            accept=".pdf,.ppt,.pptx,.jpg,.jpeg,.png"
                            onChange={(e) => handleMediaUpload(e, selectedElement!)}
                            className="hidden"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full bg-transparent"
                            onClick={() => mediaInputRef.current?.click()}
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Завантажити
                          </Button>
                        </div>
                      </>
                    )}

                    {selectedElementData.type === "hotspot" && (
                      <>
                        <div className="space-y-2">
                          <Label>Підказка при кліку</Label>
                          <Textarea
                            value={selectedElementData.data.tooltipText}
                            onChange={(e) =>
                              updateElement(selectedElement!, {
                                data: { ...selectedElementData.data, tooltipText: e.target.value },
                              })
                            }
                            rows={2}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Колір імпульсу</Label>
                          <Input
                            type="color"
                            value={selectedElementData.data.pulseColor}
                            onChange={(e) =>
                              updateElement(selectedElement!, {
                                data: { ...selectedElementData.data, pulseColor: e.target.value },
                              })
                            }
                          />
                        </div>
                      </>
                    )}

                    {selectedElementData.type === "survey" && (
                      <>
                        <div className="space-y-2">
                          <Label>Питання</Label>
                          <Textarea
                            value={selectedElementData.data.question}
                            onChange={(e) =>
                              updateElement(selectedElement!, {
                                data: { ...selectedElementData.data, question: e.target.value },
                              })
                            }
                            rows={3}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Варіанти відповіді</Label>
                          <div className="space-y-2">
                            {(selectedElementData.data.choices || []).map((ch: any, idx: number) => (
                              <div key={ch.id} className="flex items-center gap-2">
                                <Input
                                  value={ch.text}
                                  onChange={(e) => {
                                    const choices = (selectedElementData.data.choices || []).map((c: any) => (c.id === ch.id ? { ...c, text: e.target.value } : c))
                                    updateElement(selectedElement!, { data: { ...selectedElementData.data, choices } })
                                  }}
                                />
                                <label className="inline-flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={!!ch.correct}
                                    onChange={(e) => {
                                      const choices = (selectedElementData.data.choices || []).map((c: any) => (c.id === ch.id ? { ...c, correct: e.target.checked } : c))
                                      updateElement(selectedElement!, { data: { ...selectedElementData.data, choices } })
                                    }}
                                  />
                                  <span className="text-sm">Правильна</span>
                                </label>
                                <Button variant="ghost" size="icon" onClick={() => {
                                  const choices = (selectedElementData.data.choices || []).filter((c: any) => c.id !== ch.id)
                                  updateElement(selectedElement!, { data: { ...selectedElementData.data, choices } })
                                }}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                            <Button size="sm" onClick={() => {
                              const id = `c-${Date.now()}-${Math.random().toString(36).slice(2,6)}`
                              const choices = [...(selectedElementData.data.choices || []), { id, text: "Новий варіант", correct: false }]
                              updateElement(selectedElement!, { data: { ...selectedElementData.data, choices } })
                            }}>Додати варіант</Button>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <label className="inline-flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={!!selectedElementData.data.multiple}
                              onChange={(e) => updateElement(selectedElement!, { data: { ...selectedElementData.data, multiple: e.target.checked } })}
                            />
                            <span className="text-sm">Дозволити множинний вибір</span>
                          </label>
                        </div>

                        <div className="flex items-center gap-4">
                          <label className="inline-flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={!!selectedElementData.data.failOnWrong}
                              onChange={(e) => updateElement(selectedElement!, { data: { ...selectedElementData.data, failOnWrong: e.target.checked } })}
                            />
                            <span className="text-sm">Провалити курс при неправильній відповіді</span>
                          </label>
                        </div>
                      </>
                    )}

                    {selectedElementData.type === "image" && (
                      <>
                        <div className="space-y-2">
                          <Label>URL зображення</Label>
                          <Input
                            value={selectedElementData.data.url}
                            onChange={(e) =>
                              updateElement(selectedElement!, {
                                data: { ...selectedElementData.data, url: e.target.value },
                              })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Або завантажити файл</Label>
                          <input
                            ref={mediaInputRef}
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleMediaUpload(e, selectedElement!)}
                            className="hidden"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full bg-transparent"
                            onClick={() => mediaInputRef.current?.click()}
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Завантажити зображення
                          </Button>
                        </div>

                        {/* Fullscreen button */}
                        <div className="space-y-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="w-full"
                            onClick={() => {
                              // Make element fullscreen
                              const rect = canvasRef.current?.getBoundingClientRect()
                              const canvasW = rect?.width || 800
                              const canvasH = rect?.height || 600
                              updateElement(selectedElement!, {
                                position: { x: 0, y: 0 },
                                size: { width: canvasW, height: canvasH },
                              })
                              toast({ title: "Успіх", description: "Зображення розтягнуто на весь canvas" })
                            }}
                          >
                            На весь canvas
                          </Button>
                        </div>
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
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Або завантажити файл</Label>
                          <input
                            ref={mediaInputRef}
                            type="file"
                            accept="video/*"
                            onChange={(e) => handleMediaUpload(e, selectedElement!)}
                            className="hidden"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full bg-transparent"
                            onClick={() => mediaInputRef.current?.click()}
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Завантажити відео
                          </Button>
                        </div>
                      </>
                    )}

                    {/* General background color control for all element types */}
                    <div className="border-t pt-4">
                      <h4 className="font-semibold mb-3 text-sm">Колір фону елемента</h4>
                      <div className="space-y-2">
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={(selectedElementData.data as any)?.backgroundColor === "transparent"}
                            onChange={(e) =>
                              updateElement(selectedElement!, {
                                data: { ...(selectedElementData.data || {}), backgroundColor: e.target.checked ? "transparent" : "#ffffff" },
                              })
                            }
                          />
                          <span className="text-sm">Прозорий</span>
                        </label>
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <Input
                          type="color"
                          value={(selectedElementData.data as any)?.backgroundColor === "transparent" ? "#ffffff" : ((selectedElementData.data as any)?.backgroundColor || "#ffffff")}
                          onChange={(e) =>
                            updateElement(selectedElement!, {
                              data: { ...(selectedElementData.data || {}), backgroundColor: e.target.value },
                            })
                          }
                          disabled={(selectedElementData.data as any)?.backgroundColor === "transparent"}
                          className="w-16 h-10"
                        />
                        <span className="text-xs text-muted-foreground">
                          {(selectedElementData.data as any)?.backgroundColor === "transparent" ? "Без фону" : (selectedElementData.data as any)?.backgroundColor || "#ffffff"}
                        </span>
                      </div>
                    </div>

                    <Button variant="destructive" className="w-full mt-4" onClick={() => deleteElement(selectedElement!)}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Видалити елемент
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">Оберіть елемент для редагування</p>
                )}
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
