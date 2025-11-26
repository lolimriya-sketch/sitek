import { getCourseById } from "@/lib/courses"
import { getCurrentUser } from "@/lib/auth"
import { notFound, redirect } from "next/navigation"
import { CourseViewer } from "@/components/course-viewer"

export default async function CourseViewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await getCurrentUser()

  if (!user) {
    redirect("/")
  }

  const course = getCourseById(id)

  if (!course || !course.published) {
    notFound()
  }

  return <CourseViewer course={course} userId={user.id} />
}
