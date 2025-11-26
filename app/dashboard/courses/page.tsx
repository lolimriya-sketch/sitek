import { CoursesGrid } from "@/components/courses-grid"
import type { Course } from "@/lib/types"
import { getCurrentUser } from "@/lib/auth"
import { getUserAssignedCourses } from "@/lib/courses"

export default async function UserCoursesPage() {
  const user = await getCurrentUser()
  const courses: Course[] = user ? getUserAssignedCourses(user.id) : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Мої курси</h1>
        <p className="text-muted-foreground mt-1">Курси, призначені вам адміністратором</p>
      </div>
      <CoursesGrid courses={courses} />
    </div>
  )
}
