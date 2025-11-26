import { getCurrentUser } from "@/lib/auth"
import { getCompletedCourses } from "@/lib/progress"
import { getCourseById } from "@/lib/courses"
import { CompletedCoursesTable } from "@/components/completed-courses-table"
import { redirect } from "next/navigation"

export default async function CompletedCoursesPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/")
  }

  const completedProgress = getCompletedCourses(user.id)

  const completedCourses = completedProgress
    .map((progress) => ({
      progress,
      course: getCourseById(progress.courseId),
    }))
    .filter((item) => item.course !== null)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Пройдені курси</h1>
        <p className="text-muted-foreground mt-1">Історія ваших завершених курсів</p>
      </div>
      <CompletedCoursesTable items={completedCourses} />
    </div>
  )
}
