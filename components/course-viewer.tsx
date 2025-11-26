"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRef } from "react"
import { useRouter } from "next/navigation"
import type { Course, SceneElement } from "@/lib/types"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, CheckCircle, Clock, Eye, EyeOff, Target, Presentation } from "lucide-react"
import ArrowIcon from "@/components/arrow-icon"
import Link from "next/link"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface CourseViewerProps {
  course: Course
  userId: string
}

export function CourseViewer({ course, userId }: CourseViewerProps) {
  const router = useRouter()
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number } | null>(null)
  const [startTime] = useState<number>(Date.now())
  const [tabExits, setTabExits] = useState(0)
  const [progressId, setProgressId] = useState<string | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [isTabActive, setIsTabActive] = useState(true)
  const [tooltipContent, setTooltipContent] = useState<string | null>(null)
  const [completedHotspots, setCompletedHotspots] = useState<Set<string>>(new Set())
  const [inputValues, setInputValues] = useState<Record<string, string>>({})
  const [showPresentation, setShowPresentation] = useState<{ elementId: string; url: string } | null>(null)
  const [transitionButtonClicked, setTransitionButtonClicked] = useState(false)
  const [animatedTooltip, setAnimatedTooltip] = useState<{ text: string; x: number; y: number } | null>(null)

  const currentScene = course.scenes?.[currentSceneIndex]
  const totalScenes = course.scenes?.length || 0

  useEffect(() => {
    // Start course tracking
    ;(async () => {
      try {
        const res = await fetch('/api/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, courseId: course.id }),
        })
        const data = await res.json()
        // API returns { success: true, progress } when creating
        if (res.ok && data.progress && data.progress.id) setProgressId(data.progress.id)
      } catch (err) {
        // ignore
      }
    })()

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabExits((prev) => prev + 1)
        setIsTabActive(false)
      } else {
        setIsTabActive(true)
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)

    const timer = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      clearInterval(timer)
    }
  }, [userId, course.id, startTime])

  // measure canvas size for percent->px conversion
  useEffect(() => {
    function measure() {
      const rect = containerRef.current?.getBoundingClientRect()
      if (rect) setCanvasSize({ width: rect.width, height: rect.height })
    }
    measure()
    window.addEventListener("resize", measure)
    return () => window.removeEventListener("resize", measure)
  }, [currentSceneIndex])

  function handleBackgroundImageLoad(img: HTMLImageElement) {
    // determine canvas display size based on container width and image natural aspect
    const rect = containerRef.current?.getBoundingClientRect()
    const containerWidth = rect?.width || img.naturalWidth || 800
    const naturalW = img.naturalWidth || containerWidth
    const naturalH = img.naturalHeight || Math.round(naturalW * 0.6)
    const height = Math.round((containerWidth * naturalH) / naturalW)
    setCanvasSize({ width: containerWidth, height })

    // debug: print canvas size for diagnostics
    // eslint-disable-next-line no-console
    console.debug("[viewer] handleBackgroundImageLoad", { courseId: course.id, containerWidth, naturalW, naturalH, height })
  }

  useEffect(() => {
    setTransitionButtonClicked(false)
  }, [currentSceneIndex])

  const progress = totalScenes > 0 ? ((currentSceneIndex + 1) / totalScenes) * 100 : 0
  const isLastScene = currentSceneIndex === totalScenes - 1

  function formatTime(seconds: number) {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  async function handleComplete() {
    if (progressId) {
      try {
        const duration = Math.floor((Date.now() - startTime) / 1000)
        const res = await fetch('/api/progress')
        const list = res.ok ? await res.json() : []
        const updated = (list || []).map((p: any) =>
          p.id === progressId ? { ...p, completedAt: new Date().toISOString(), duration, tabExits, status: 'completed' } : p,
        )
        await fetch('/api/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ progress: updated }),
        })
      } catch (err) {
        // ignore
      }
    }
    router.push("/dashboard/completed")
  }

  async function trackInteraction(elementId: string, elementType: string, action: string, value?: any) {
    if (progressId && currentScene) {
      try {
        const res = await fetch('/api/progress')
        const list = res.ok ? await res.json() : []
        const updated = (list || []).map((p: any) => {
          if (p.id !== progressId) return p
          const interactions = p.interactions || []
          interactions.push({ timestamp: new Date().toISOString(), sceneId: currentScene.id, elementId, elementType, action, value })
          return { ...p, interactions }
        })
        await fetch('/api/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ progress: updated }),
        })
      } catch (err) {
        // ignore
      }
    }
  }

  async function handleElementClick(element: SceneElement, event?: React.MouseEvent) {
    await trackInteraction(element.id, element.type, "click")

    if (element.type === "button") {
      setTransitionButtonClicked(true)

      if (element.data.action === "next-scene" && !isLastScene) {
        setCurrentSceneIndex(currentSceneIndex + 1)
        setCompletedHotspots(new Set())
        setInputValues({})
      } else if (element.data.action === "goto-scene" && element.data.targetScene) {
        const targetIndex = course.scenes.findIndex((s) => s.id === element.data.targetScene)
        if (targetIndex !== -1) {
          setCurrentSceneIndex(targetIndex)
          setCompletedHotspots(new Set())
          setInputValues({})
        }
      } else if (element.data.action === "complete") {
        handleComplete()
      }
    } else if (element.type === "hotspot") {
      if (event) {
        const rect = event.currentTarget.getBoundingClientRect()
        setAnimatedTooltip({
          text: element.data.tooltipText,
          x: rect.left + rect.width / 2,
          y: rect.top - 10,
        })
        setTimeout(() => setAnimatedTooltip(null), 3000)
      }
      setCompletedHotspots(new Set([...completedHotspots, element.id]))
    } else if (element.type === "presentation") {
      setShowPresentation({ elementId: element.id, url: element.data.url })
      await trackInteraction(element.id, element.type, "open-presentation")
    }
  }

  async function handleInputChange(elementId: string, value: string) {
    setInputValues({ ...inputValues, [elementId]: value })
    await trackInteraction(elementId, "input", "input-change", value)
  }

  function hasTransitionButton() {
    if (!currentScene) return false
    return currentScene.elements.some(
      (el) =>
        el.type === "button" &&
        (el.data.action === "next-scene" || el.data.action === "goto-scene" || el.data.action === "complete"),
    )
  }

  function canProgressToNextScene() {
    if (!currentScene) return true

    // If scene has a transition button, it must be clicked
    if (hasTransitionButton()) {
      return transitionButtonClicked
    }

    return true
  }

  if (!course.scenes || course.scenes.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card className="p-12">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold">Курс порожній</h2>
            <p className="text-muted-foreground">Цей курс ще не має контенту</p>
            <Link href="/dashboard/courses">
              <Button>Повернутись до курсів</Button>
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/dashboard/courses">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Назад
          </Button>
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{formatTime(elapsedTime)}</span>
          </div>
          <div className="flex items-center gap-2">
            {isTabActive ? <Eye className="h-4 w-4 text-green-500" /> : <EyeOff className="h-4 w-4 text-destructive" />}
            <span className="text-xs text-muted-foreground">Виходи: {tabExits}</span>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          Сцена {currentSceneIndex + 1} / {totalScenes}
        </div>
      </div>

      <div>
        <h1 className="text-3xl font-bold mb-2">{course.title}</h1>
        <Progress value={progress} className="h-2" />
      </div>

      {currentScene && (
        <Card className="p-0 overflow-hidden">
          <div ref={containerRef} className="relative bg-muted" style={{ minHeight: "600px" }}>
            {/* Scene background/screenshot */}
            {currentScene.screenshot && (
              <img
                src={currentScene.screenshot || "/placeholder.svg"}
                alt={currentScene.name}
                onLoad={(e) => handleBackgroundImageLoad(e.currentTarget)}
                className="absolute left-0 w-full pointer-events-none"
                style={{ height: canvasSize ? `${canvasSize.height}px` : "100%", objectFit: "cover" }}
              />
            )}

            {currentScene.elements.map((element, idx) => {
              const canvasW = canvasSize?.width || 800
              const canvasH = canvasSize?.height || 600
              const posPerc = (element as any).positionPercent
              const sizePerc = (element as any).sizePercent
              const left = posPerc ? Math.round((posPerc.x / 100) * canvasW) : element.position?.x || 0
              const top = posPerc ? Math.round((posPerc.y / 100) * canvasH) : element.position?.y || 0
              const width = sizePerc ? Math.round((sizePerc.width / 100) * canvasW) : element.size?.width || 0
              const height = sizePerc ? Math.round((sizePerc.height / 100) * canvasH) : element.size?.height || 0

              // debug: log first element computed positions to compare with editor
              if (idx === 0) {
                // eslint-disable-next-line no-console
                console.debug("[viewer] first element computed", { id: element.id, left, top, width, height, canvasW, canvasH })
              }

              return (
                <div
                key={element.id}
                className={`absolute ${element.type !== "input" ? "cursor-pointer" : ""} transition-all ${element.type === "button" ? "hover:scale-105" : ""}`}
                style={{
                  left: `${left}px`,
                  top: `${top}px`,
                  width: `${width}px`,
                  height: `${height}px`,
                  transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
                }}
                onClick={(e) => element.type !== "input" && handleElementClick(element, e)}
              >
                {element.type === "text" && (
                  <div
                    className="w-full h-full p-2 rounded shadow-lg"
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
                    className="w-full h-full object-cover rounded shadow-lg"
                  />
                )}

                {element.type === "video" && element.data.url && (
                  <video
                    src={element.data.url}
                    controls
                    autoPlay={element.data.autoplay}
                    className="w-full h-full rounded shadow-lg"
                  />
                )}

                {element.type === "button" && (
                  <Button
                    size="lg"
                    className="w-full h-full text-lg shadow-lg"
                    style={{
                      backgroundColor: element.data.backgroundColor,
                      color: element.data.textColor,
                    }}
                  >
                    {element.data.label}
                  </Button>
                )}

                {element.type === "input" && (
                  <div className="w-full h-full">
                    {element.data.multiline ? (
                      <Textarea
                        placeholder={element.data.placeholder}
                        value={inputValues[element.id] || ""}
                        onChange={(e) => handleInputChange(element.id, e.target.value)}
                        required={element.data.required}
                        className="w-full h-full shadow-lg resize-none"
                      />
                    ) : (
                      <Input
                        placeholder={element.data.placeholder}
                        value={inputValues[element.id] || ""}
                        onChange={(e) => handleInputChange(element.id, e.target.value)}
                        required={element.data.required}
                        className="w-full h-full shadow-lg"
                      />
                    )}
                  </div>
                )}

                {element.type === "presentation" && (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-white border-2 border-gray-300 rounded shadow-lg hover:bg-gray-50 transition-colors">
                    <Presentation className="h-12 w-12 text-primary mb-2" />
                    <span className="text-sm font-medium text-center px-2">{element.data.fileName}</span>
                    <span className="text-xs text-muted-foreground mt-1">Клікніть для перегляду</span>
                  </div>
                )}

                {element.type === "hotspot" && (
                  <div
                    className={`w-full h-full rounded-full flex items-center justify-center shadow-lg transition-all ${
                      completedHotspots.has(element.id) ? "opacity-50" : "animate-pulse"
                    }`}
                    style={{ backgroundColor: element.data.pulseColor + "40" }}
                  >
                    <Target className="h-8 w-8" style={{ color: element.data.pulseColor }} />
                  </div>
                )}

                {element.type === "arrow" && (
                  <div className="w-full h-full flex items-center justify-center pointer-events-none">
                    <ArrowIcon className="h-8 w-8" color={(element.data as any).color} thickness={(element.data as any).thickness} />
                  </div>
                )}

                {element.type === "tooltip" && (
                  <div
                    className="w-full h-full p-3 rounded shadow-lg text-sm"
                    style={{
                      backgroundColor: element.data.backgroundColor,
                      color: element.data.textColor,
                    }}
                  >
                    {element.data.text}
                  </div>
                )}
              </div>
            )})}

            {animatedTooltip && (
              <div
                className="fixed z-50 animate-in fade-in slide-in-from-bottom-2 duration-300"
                style={{
                  left: `${animatedTooltip.x}px`,
                  top: `${animatedTooltip.y}px`,
                  transform: "translate(-50%, -100%)",
                }}
              >
                <div className="bg-gray-900 text-white px-4 py-2 rounded-lg shadow-xl max-w-xs">
                  <p className="text-sm">{animatedTooltip.text}</p>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => {
            setCurrentSceneIndex(Math.max(0, currentSceneIndex - 1))
            setCompletedHotspots(new Set())
          }}
          disabled={currentSceneIndex === 0}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Попередня сцена
        </Button>

        {isLastScene ? (
          <Button onClick={handleComplete} className="gap-2" disabled={!canProgressToNextScene()}>
            <CheckCircle className="h-4 w-4" />
            Завершити курс
          </Button>
        ) : (
          <Button
            onClick={() => {
              if (canProgressToNextScene()) {
                setCurrentSceneIndex(currentSceneIndex + 1)
                setCompletedHotspots(new Set())
                setInputValues({})
              }
            }}
            disabled={!canProgressToNextScene()}
          >
            Наступна сцена
            <ArrowLeft className="h-4 w-4 ml-2 rotate-180" />
          </Button>
        )}
      </div>

      <Dialog open={!!showPresentation} onOpenChange={(open) => !open && setShowPresentation(null)}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>Презентація</DialogTitle>
          </DialogHeader>
          {showPresentation?.url && (
            <div className="flex-1 overflow-hidden">
              {showPresentation.url.startsWith("data:application/pdf") || showPresentation.url.endsWith(".pdf") ? (
                <iframe src={showPresentation.url} className="w-full h-full border-0" title="Presentation" />
              ) : (
                <img
                  src={showPresentation.url || "/placeholder.svg"}
                  alt="Presentation"
                  className="w-full h-full object-contain"
                />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
