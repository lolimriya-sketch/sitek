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

  // Group progress by userId to avoid duplicate entries per user in the detailed list
  const progressByUser = new Map<string, any[]>()
  for (const p of allProgress) {
    const arr = progressByUser.get(p.userId) || []
    arr.push(p)
    progressByUser.set(p.userId, arr)
  }

  const groupedProgress = Array.from(progressByUser.entries()).map(([userId, attempts]) => {
    // determine overall status: completed if any attempt is completed, otherwise most recent status
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
              <p className="text-sm text-muted-foreground">Всього спроб</p>
              <p className="text-2xl font-bold">{allProgress.length}</p>
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
              <p className="text-2xl font-bold">{allProgress.filter((p) => p.status === "completed").length}</p>
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
                {allProgress.length > 0
                  ? formatDuration(
                      Math.floor(
                        allProgress.reduce((sum, p) => sum + (Number(p?.duration) || 0), 0) / allProgress.length,
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
                {allProgress.length > 0
                  ? Math.floor(allProgress.reduce((sum, p) => sum + (Number(p?.tabExits) || 0), 0) / allProgress.length)
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
              <TabsTrigger value="all">Всі ({allProgress.length})</TabsTrigger>
              <TabsTrigger value="completed">
                Завершені ({allProgress.filter((p) => p.status === "completed").length})
              </TabsTrigger>
              <TabsTrigger value="in-progress">
                В процесі ({allProgress.filter((p) => p.status === "in-progress").length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              <div className="space-y-4 mt-4">
                {allProgress.map((progress) => {
                  const progressUser = users.find((u) => u.id === progress.userId)
                  return (
                    <Card key={progress.id} className="p-4">
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
                              progress.status === "completed"
                                ? "bg-green-500/10 text-green-500"
                                : "bg-blue-500/10 text-blue-500"
                            }`}
                          >
                            {progress.status === "completed" ? "Завершено" : "В процесі"}
                          </span>
                        </div>

                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Тривалість</p>
                          <p className="font-medium">{formatDuration(Number(progress.duration) || 0)}</p>
                        </div>

                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Виходи з вкладки</p>
                          <p className="font-medium">{Number(progress.tabExits) || 0}</p>
                        </div>

                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Початок</p>
                          <p className="text-sm">{formatDate(progress.startedAt)}</p>
                          {progress.completedAt && (
                            <>
                              <p className="text-sm text-muted-foreground mt-2">Завершення</p>
                              <p className="text-sm">{formatDate(progress.completedAt)}</p>
                            </>
                          )}
                        </div>
                      </div>

                      {/* User Interactions */}
                      {progress.interactions && progress.interactions.length > 0 && (
                        <div className="mt-4 pt-4 border-t">
                          <p className="text-sm font-medium mb-2 flex items-center gap-2">
                            <MousePointer className="h-4 w-4" />
                            Взаємодії ({progress.interactions.length})
                          </p>
                          <div className="space-y-1 max-h-40 overflow-y-auto">
                            {progress.interactions.map((interaction: any, idx: number) => (
                              <div key={idx} className="text-xs bg-muted p-2 rounded">
                                <span className="font-medium">{interaction.action}</span> на{" "}
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

                      {/* Reset Progress Button */}
                      {progress.status === "completed" && (
                        <div className="mt-4 pt-4 border-t flex justify-end">
                          <ResetProgressButton
                            progressId={progress.id}
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
                {allProgress
                  .filter((p) => p.status === "completed")
                  .map((progress) => {
                    const progressUser = users.find((u) => u.id === progress.userId)
                    return (
                      <Card key={progress.id} className="p-4">
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Користувач</p>
                            <p className="font-medium">{progressUser?.name || "Невідомий"}</p>
                            <p className="text-xs text-muted-foreground">{progressUser?.email}</p>
                          </div>

                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Тривалість</p>
                              <p className="font-medium">{formatDuration(Number(progress.duration) || 0)}</p>
                          </div>

                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Виходи</p>
                            <p className="font-medium">{Number(progress.tabExits) || 0}</p>
                          </div>

                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Завершено</p>
                            <p className="text-sm">{formatDate(progress.completedAt!)}</p>
                          </div>

                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Взаємодій</p>
                            <p className="font-medium">{progress.interactions?.length || 0}</p>
                          </div>
                        </div>
                      </Card>
                    )
                  })}
              </div>
            </TabsContent>

            <TabsContent value="in-progress">
              <div className="space-y-4 mt-4">
                {allProgress
                  .filter((p) => p.status === "in-progress")
                  .map((progress) => {
                    const progressUser = users.find((u) => u.id === progress.userId)
                    return (
                      <Card key={progress.id} className="p-4">
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Користувач</p>
                            <p className="font-medium">{progressUser?.name || "Невідомий"}</p>
                          </div>

                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Тривалість</p>
                            <p className="font-medium">{formatDuration(progress.duration)}</p>
                          </div>

                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Початок</p>
                            <p className="text-sm">{formatDate(progress.startedAt)}</p>
                          </div>

                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Взаємодій</p>
                            <p className="font-medium">{progress.interactions?.length || 0}</p>
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
