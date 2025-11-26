import { getCourseById } from "@/lib/courses"
import { notFound } from "next/navigation"
import { CourseEditor } from "@/components/course-editor"

export default async function CourseEditorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const course = getCourseById(id)

  if (!course) {
    notFound()
  }

  return <CourseEditor course={course} />
}
