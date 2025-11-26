import { getCurrentUser } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getCourseById, getAllCourseProgress } from "@/lib/courses"
import { getAllUsers } from "@/lib/auth"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, Clock, Eye, MousePointer, User } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ResetProgressButton } from "@/components/reset-progress-button"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function CourseAnalyticsPage({ params }: PageProps) {
  const user = await getCurrentUser()
  if (!user || user.role !== "admin") {
    redirect("/")
  }

  const { id } = await params
  const course = getCourseById(id)
  if (!course) {
    redirect("/admin/courses")
  }

  const allProgress = getAllCourseProgress(id) as any[]
  const users = getAllUsers() as any[]

  // Group progress by userId to avoid duplicate entries per user
  const progressByUser = new Map<string, any[]>()
  for (const p of allProgress) {
    const arr = progressByUser.get(p.userId) || []
    arr.push(p)
    progressByUser.set(p.userId, arr)
  }

  const groupedProgress = Array.from(progressByUser.entries()).map(([userId, attempts]) => {
    const hasCompleted = attempts.some((a) => a.status === "completed")
    const latest = attempts.reduce((a, b) => (new Date(a.startedAt) > new Date(b.startedAt) ? a : b))
    const first = attempts.reduce((a, b) => (new Date(a.startedAt) < new Date(b.startedAt) ? a : b))
    return {
      userId,
      attempts,
      attemptsCount: attempts.length,
      status: hasCompleted ? "completed" : latest.status,
      latestAttempt: latest,
      firstAttempt: first,
    }
  })

  function formatDuration(seconds: number) {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}хв ${secs}с`
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleString("uk-UA", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // Attempt duration in seconds: prefer stored `duration`, otherwise compute from timestamps
  function getAttemptDurationSeconds(attempt: any) {
    const stored = Number(attempt?.duration)
    if (!Number.isNaN(stored) && stored > 0) return Math.floor(stored)
    if (attempt?.startedAt && attempt?.completedAt) {
      const started = new Date(attempt.startedAt).getTime()
      const completed = new Date(attempt.completedAt).getTime()
      if (!Number.isNaN(started) && !Number.isNaN(completed) && completed > started) {
        return Math.floor((completed - started) / 1000)
      }
    }
    return 0
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/admin/courses/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Аналітика курсу</h1>
          <p className="text-muted-foreground mt-1">{course.title}</p>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Кількість учасників</p>
              <p className="text-2xl font-bold">{groupedProgress.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-500/10 rounded-lg">
              <Clock className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Завершено</p>
              <p className="text-2xl font-bold">{groupedProgress.filter((g) => g.status === "completed").length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-lg">
              <Clock className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Середній час</p>
              <p className="text-2xl font-bold">
                {groupedProgress.length > 0
                  ? formatDuration(
                      Math.floor(
                        groupedProgress.reduce((sum, g) => sum + (Number(g.latestAttempt?.duration) || 0), 0) / groupedProgress.length,
                      ),
                    )
                  : "0хв"}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-500/10 rounded-lg">
              <Eye className="h-6 w-6 text-orange-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Середні виходи</p>
              <p className="text-2xl font-bold">
                {groupedProgress.length > 0
                  ? Math.floor(groupedProgress.reduce((sum, g) => sum + (Number(g.latestAttempt?.tabExits) || 0), 0) / groupedProgress.length)
                  : 0}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Detailed Progress Table */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Детальна історія</h3>

        {allProgress.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Ще немає даних про проходження курсу</p>
        ) : (
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">Всі ({groupedProgress.length})</TabsTrigger>
              <TabsTrigger value="completed">Завершені ({groupedProgress.filter((g) => g.status === "completed").length})</TabsTrigger>
              <TabsTrigger value="in-progress">В процесі ({groupedProgress.filter((g) => g.status !== "completed").length})</TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              <div className="space-y-4 mt-4">
                {groupedProgress.map((gp) => {
                  const progressUser = users.find((u) => u.id === gp.userId)
                  const latest = gp.latestAttempt
                  return (
                    <Card key={gp.userId} className="p-4">
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Користувач</p>
                          <p className="font-medium">{progressUser?.name || "Невідомий"}</p>
                          <p className="text-xs text-muted-foreground">{progressUser?.email}</p>
                        </div>

                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Статус</p>
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                              gp.status === "completed" ? "bg-green-500/10 text-green-500" : "bg-blue-500/10 text-blue-500"
                            }`}
                          >
                            {gp.status === "completed" ? "Завершено" : "В процесі"}
                          </span>
                        </div>

                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Тривалість (ост.)</p>
                          <p className="font-medium">{formatDuration(Number(latest.duration) || 0)}</p>
                        </div>

                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Виходи з вкладки (ост.)</p>
                          <p className="font-medium">{Number(latest.tabExits) || 0}</p>
                        </div>

                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Спроби</p>
                          <p className="text-sm">{gp.attemptsCount} (з {formatDate(gp.firstAttempt.startedAt)} до {gp.latestAttempt.completedAt ? formatDate(gp.latestAttempt.completedAt) : formatDate(gp.latestAttempt.startedAt)})</p>
                        </div>
                      </div>

                      {/* Latest interactions preview */}
                      {latest.interactions && latest.interactions.length > 0 && (
                        <div className="mt-4 pt-4 border-t">
                          <p className="text-sm font-medium mb-2 flex items-center gap-2">
                            <MousePointer className="h-4 w-4" />
                            Взаємодії (ост.) {latest.interactions.length}
                          </p>
                          <div className="space-y-1 max-h-40 overflow-y-auto">
                            {latest.interactions.map((interaction: any, idx: number) => (
                              <div key={idx} className="text-xs bg-muted p-2 rounded">
                                <span className="font-medium">{interaction.action}</span> на {" "}
                                <span className="text-muted-foreground">{interaction.elementType}</span>
                                {interaction.elementType === "input" && interaction.value && (
                                  <div className="mt-1 p-2 bg-background rounded border">
                                    <span className="text-muted-foreground">Введено: </span>
                                    <span className="font-mono">{interaction.value}</span>
                                  </div>
                                )}
                                <span className="text-muted-foreground ml-2">
                                  {new Date(interaction.timestamp).toLocaleTimeString("uk-UA")}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Reset Progress Button (for completed show last progress id) */}
                      {gp.status === "completed" && (
                        <div className="mt-4 pt-4 border-t flex justify-end">
                          <ResetProgressButton
                            progressId={gp.latestAttempt.id}
                            userName={progressUser?.name || "користувача"}
                          />
                        </div>
                      )}
                    </Card>
                  )
                })}
              </div>
            </TabsContent>

            <TabsContent value="completed">
              <div className="space-y-4 mt-4">
                {groupedProgress
                  .filter((g) => g.status === "completed")
                  .map((g) => {
                    const progressUser = users.find((u) => u.id === g.userId)
                    const latest = g.latestAttempt
                    return (
                      <Card key={g.userId} className="p-4">
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Користувач</p>
                            <p className="font-medium">{progressUser?.name || "Невідомий"}</p>
                            <p className="text-xs text-muted-foreground">{progressUser?.email}</p>
                          </div>

                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Тривалість</p>
                              <p className="font-medium">{formatDuration(Number(latest.duration) || 0)}</p>
                          </div>

                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Виходи</p>
                            <p className="font-medium">{Number(latest.tabExits) || 0}</p>
                          </div>

                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Завершено</p>
                            <p className="text-sm">{formatDate(latest.completedAt!)}</p>
                          </div>

                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Взаємодій</p>
                            <p className="font-medium">{latest.interactions?.length || 0}</p>
                          </div>
                        </div>
                      </Card>
                    )
                  })}
              </div>
            </TabsContent>

            <TabsContent value="in-progress">
              <div className="space-y-4 mt-4">
                {groupedProgress
                  .filter((g) => g.status !== "completed")
                  .map((g) => {
                    const progressUser = users.find((u) => u.id === g.userId)
                    const latest = g.latestAttempt
                    return (
                      <Card key={g.userId} className="p-4">
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Користувач</p>
                            <p className="font-medium">{progressUser?.name || "Невідомий"}</p>
                          </div>

                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Тривалість</p>
                            <p className="font-medium">{formatDuration(latest.duration)}</p>
                          </div>

                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Початок</p>
                            <p className="text-sm">{formatDate(g.firstAttempt.startedAt)}</p>
                          </div>

                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Взаємодій</p>
                            <p className="font-medium">{latest.interactions?.length || 0}</p>
                          </div>
                        </div>
                      </Card>
                    )
                  })}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </Card>
    </div>
  )
}
