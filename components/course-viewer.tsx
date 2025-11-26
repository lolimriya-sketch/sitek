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
  const bgImgRef = useRef<HTMLImageElement | null>(null)
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number } | null>(null)
  const [scale, setScale] = useState(1)
  const [startTime] = useState<number>(Date.now())
  const [tabExits, setTabExits] = useState(0)
  const [progressId, setProgressId] = useState<string | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [isTabActive, setIsTabActive] = useState(true)
  const [tooltipContent, setTooltipContent] = useState<string | null>(null)
  const [completedHotspots, setCompletedHotspots] = useState<Set<string>>(new Set())
  const [inputValues, setInputValues] = useState<Record<string, string>>({})
  const [surveySelections, setSurveySelections] = useState<Record<string, Set<string>>>({})
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

  // measure canvas size and calculate dimensions to fit viewport
  useEffect(() => {
    function measure() {
      if (!containerRef.current) return
      
      // Get available space in viewport
      const availableHeight = window.innerHeight - 220 // account for header/footer controls
      const availableWidth = window.innerWidth - 40 // small margin
      
      // Get natural image dimensions from scene or use defaults
      const naturalW = (currentScene as any)?.screenshotNaturalWidth || 800
      const naturalH = (currentScene as any)?.screenshotNaturalHeight || 600
      
      // Calculate dimensions to fit both width and height without distortion
      const ratioByWidth = availableWidth / naturalW
      const ratioByHeight = availableHeight / naturalH
      const fitRatio = Math.min(ratioByWidth, ratioByHeight, 1) // don't enlarge beyond natural size
      
      // Calculate actual display dimensions (not scaled transform, but actual size)
      const displayW = Math.round(naturalW * fitRatio)
      const displayH = Math.round(naturalH * fitRatio)
      
      setScale(fitRatio)
      setCanvasSize({ width: displayW, height: displayH })
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

  async function handleSurveySubmit(element: SceneElement) {
    // gather selected ids for this element
    const selected = Array.from(surveySelections[element.id] || [])
    const correctChoices = (element.data.choices || []).filter((c: any) => c.correct).map((c: any) => c.id)

    const eq = (a: string[], b: string[]) => {
      if (a.length !== b.length) return false
      const sa = new Set(a)
      return b.every((x) => sa.has(x))
    }

    const isCorrect = eq(selected, correctChoices)
    await trackInteraction(element.id, element.type, "submit", { selected, isCorrect })

    if (isCorrect) {
      // proceed to next scene (or complete)
      if (!isLastScene) {
        setCurrentSceneIndex(currentSceneIndex + 1)
        setCompletedHotspots(new Set())
        setInputValues({})
        setSurveySelections({})
      } else {
        handleComplete()
      }
      return
    }

    // wrong answer
    if (element.data.failOnWrong) {
      // mark progress as failed
      if (progressId) {
        try {
          const duration = Math.floor((Date.now() - startTime) / 1000)
          const res = await fetch('/api/progress')
          const list = res.ok ? await res.json() : []
          const updated = (list || []).map((p: any) =>
            p.id === progressId ? { ...p, completedAt: new Date().toISOString(), duration, tabExits, status: 'failed' } : p,
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
      // redirect to courses list (failed)
      router.push('/dashboard/courses')
    } else {
      // allow retry: show a small animation/tooltip
      // (simple: flash tooltip)
      setTimeout(() => {}, 300)
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
    <div className="w-full min-h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card p-4">
        <div className="flex items-center justify-between mb-4">
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
            <div className="text-sm text-muted-foreground">
              Сцена {currentSceneIndex + 1} / {totalScenes}
            </div>
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-bold mb-2">{course.title}</h1>
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      {/* Canvas - fit to viewport without scroll */}
      <div className="flex-1 flex items-center justify-center overflow-hidden bg-muted p-4">
        {currentScene && (
          <div
            ref={containerRef}
            className="relative bg-white shadow-lg"
            style={{
              width: `${canvasSize?.width || 800}px`,
              height: `${canvasSize?.height || 600}px`,
              overflow: 'hidden',
            }}
          >
            {/* Scene background/screenshot */}
            {currentScene.screenshot && (
              <img
                ref={bgImgRef}
                src={currentScene.screenshot || "/placeholder.svg"}
                alt={currentScene.name}
                onLoad={(e) => handleBackgroundImageLoad(e.currentTarget)}
                className="absolute left-0 top-0 w-full h-full pointer-events-none"
                style={{ objectFit: "contain", objectPosition: "center" }}
              />
            )}

            {currentScene.elements.map((element, idx) => {
              // Canvas dimensions at natural (non-scaled) size
              const naturalW = (currentScene as any)?.screenshotNaturalWidth || 800
              const naturalH = (currentScene as any)?.screenshotNaturalHeight || 600
              
              // Get element position/size - use px fields directly (no percent)
              const naturalLeft = (element.position as any)?.x ?? 0
              const naturalTop = (element.position as any)?.y ?? 0
              const naturalWidth = (element.size as any)?.width ?? 0
              const naturalHeight = (element.size as any)?.height ?? 0

              // Determine displayed image rect inside container (account for object-fit: contain)
              let imgLeft = 0
              let imgTop = 0
              let imgW = canvasSize?.width || naturalW
              let imgH = canvasSize?.height || naturalH
              try {
                const containerRect = containerRef.current?.getBoundingClientRect()
                const imgRect = bgImgRef.current?.getBoundingClientRect()
                if (imgRect && containerRect) {
                  imgLeft = imgRect.left - containerRect.left
                  imgTop = imgRect.top - containerRect.top
                  imgW = imgRect.width
                  imgH = imgRect.height
                }
              } catch (e) {
                // ignore
              }

              // Use uniform scale (min of both axes) to preserve aspect ratio and prevent distortion
              const scaleX = imgW / naturalW || 1
              const scaleY = imgH / naturalH || 1
              const scale = Math.min(scaleX, scaleY)

              const left = Math.round(imgLeft + naturalLeft * scale)
              const top = Math.round(imgTop + naturalTop * scale)
              const width = Math.round(naturalWidth * scale)
              const height = Math.round(naturalHeight * scale)

              // debug: log first element computed positions to compare with editor
              if (idx === 0) {
                // eslint-disable-next-line no-console
                console.debug("[viewer] first element computed", { id: element.id, scale, left, top, width, height, naturalW, naturalH })
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
                      fontSize: `${Math.round(((element.data as any).fontSize || 16) * scale)}px`,
                      color: element.data.color,
                      backgroundColor: element.data.backgroundColor,
                      overflow: 'hidden',
                    }}
                  >
                    {element.data.text}
                  </div>
                )}

                  {element.type === "image" && element.data.url && (
                    <img
                      src={element.data.url || "/placeholder.svg"}
                      alt=""
                      className="w-full h-full object-contain rounded shadow-lg"
                      style={{ objectPosition: "center" }}
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
                  <div
                    className="w-full h-full rounded font-medium shadow-lg pointer-events-auto"
                    style={{
                      backgroundColor: element.data.backgroundColor,
                      color: element.data.textColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      fontSize: `${Math.round(((element.data as any).fontSize || 16) * scale)}px`,
                      lineHeight: `${height}px`,
                      userSelect: 'none',
                    }}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleElementClick(element, e as unknown as React.MouseEvent)
                    }}
                  >
                    {element.data.label}
                  </div>
                )}

                {element.type === "input" && (
                  <div className="w-full h-full">
                    {element.data.multiline ? (
                      <textarea
                        placeholder={element.data.placeholder}
                        value={inputValues[element.id] || ""}
                        onChange={(e) => handleInputChange(element.id, e.target.value)}
                        required={element.data.required}
                        className="w-full h-full shadow-lg resize-none border rounded px-2"
                        style={{ fontSize: `${Math.round(((element.data as any).fontSize || 14) * scale)}px`, padding: `${Math.max(4, Math.round(6 * scale))}px` }}
                      />
                    ) : (
                      <input
                        placeholder={element.data.placeholder}
                        value={inputValues[element.id] || ""}
                        onChange={(e) => handleInputChange(element.id, e.target.value)}
                        required={element.data.required}
                        className="w-full h-full shadow-lg border rounded px-2"
                        style={{ fontSize: `${Math.round(((element.data as any).fontSize || 14) * scale)}px`, padding: `${Math.max(4, Math.round(6 * scale))}px` }}
                      />
                    )}
                  </div>
                )}

                {element.type === "presentation" && (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-white border-2 border-gray-300 rounded shadow-lg hover:bg-gray-50 transition-colors" style={{ gap: '6px' }}>
                    <Presentation className="" style={{ width: Math.round(Math.min(width, height) * 0.5), height: Math.round(Math.min(width, height) * 0.5), color: '#0EA5A4' }} />
                    <span className="text-sm font-medium text-center px-2" style={{ fontSize: `${Math.max(10, Math.round(12 * scale))}px` }}>{element.data.fileName}</span>
                    <span className="text-xs text-muted-foreground mt-1" style={{ fontSize: `${Math.max(9, Math.round(10 * scale))}px` }}>Клікніть для перегляду</span>
                  </div>
                )}

                {element.type === "hotspot" && (
                  <div
                    className={`w-full h-full rounded-full flex items-center justify-center shadow-lg transition-all ${
                      completedHotspots.has(element.id) ? "opacity-50" : "animate-pulse"
                    }`}
                    style={{ backgroundColor: element.data.pulseColor + "40" }}
                  >
                    <Target className="" style={{ width: Math.round(Math.min(width, height) * 0.6), height: Math.round(Math.min(width, height) * 0.6), color: element.data.pulseColor }} />
                  </div>
                )}

                {element.type === "survey" && (
                  <div className="w-full h-full bg-white rounded shadow-md p-4 flex flex-col justify-between">
                    <div>
                      <p className="font-semibold mb-2">{element.data.question}</p>
                      <div className="space-y-2">
                        {(element.data.choices || []).map((ch: any) => {
                          const selectedSet = surveySelections[element.id] || new Set<string>()
                          const checked = selectedSet.has(ch.id)
                          if (element.data.multiple) {
                            return (
                              <label key={ch.id} className="inline-flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => {
                                    const prev = new Set(surveySelections[element.id] || [])
                                    if (prev.has(ch.id)) prev.delete(ch.id)
                                    else prev.add(ch.id)
                                    setSurveySelections({ ...surveySelections, [element.id]: prev })
                                  }}
                                />
                                <span>{ch.text}</span>
                              </label>
                            )
                          }
                          return (
                            <label key={ch.id} className="inline-flex items-center gap-2">
                              <input
                                type="radio"
                                name={`survey-${element.id}`}
                                checked={checked}
                                onChange={() => setSurveySelections({ ...surveySelections, [element.id]: new Set([ch.id]) })}
                              />
                              <span>{ch.text}</span>
                            </label>
                          )
                        })}
                      </div>
                    </div>

                    <div className="mt-3 flex justify-end">
                      <div
                        role="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSurveySubmit(element)
                        }}
                        className="rounded px-3 py-2 bg-primary text-white cursor-pointer"
                        style={{ fontSize: `${Math.round(((element.data as any).fontSize || 14) * scale)}px` }}
                      >
                        Відправити
                      </div>
                    </div>
                  </div>
                )}

                {element.type === "arrow" && (
                  <div className="w-full h-full flex items-center justify-center pointer-events-none">
                    <div style={{ width: Math.round(Math.min(width, height) * 0.6), height: Math.round(Math.min(width, height) * 0.6) }}>
                      <ArrowIcon className="w-full h-full" color={(element.data as any).color} thickness={(element.data as any).thickness} />
                    </div>
                  </div>
                )}

                {element.type === "tooltip" && (
                  <div
                    className="w-full h-full p-3 rounded shadow-lg text-sm"
                    style={{
                      backgroundColor: element.data.backgroundColor,
                      color: element.data.textColor,
                      fontSize: `${Math.round(((element.data as any).fontSize || 14) * scale)}px`,
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
        )}
      </div>

      {/* Footer Controls */}
      <div className="border-t bg-card p-4 flex items-center justify-between">
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
