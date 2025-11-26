import { getAllCourses } from "@/lib/courses"
import { CoursesTable } from "@/components/courses-table"
import { CreateCourseDialog } from "@/components/create-course-dialog"

export default async function CoursesPage() {
  const courses = getAllCourses()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Курси</h1>
          <p className="text-muted-foreground mt-1">Створюйте та редагуйте інтерактивні курси</p>
        </div>
        <CreateCourseDialog />
      </div>
      <CoursesTable courses={courses} />
    </div>
  )
}
