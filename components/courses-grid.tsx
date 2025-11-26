"use client"

import type { Course } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BookOpen, Layers } from "lucide-react"
import Link from "next/link"

interface CoursesGridProps {
  courses: Course[]
}

export function CoursesGrid({ courses }: CoursesGridProps) {
  if (courses.length === 0) {
    return (
      <Card className="p-12">
        <div className="text-center space-y-2">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground" />
          <h3 className="text-lg font-semibold">Немає призначених курсів</h3>
          <p className="text-muted-foreground">Курси з'являться тут після призначення адміністратором</p>
        </div>
      </Card>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {courses.map((course) => (
        <Card key={course.id} className="flex flex-col hover:shadow-lg transition-shadow">
          {course.thumbnail && (
            <div className="w-full h-40 overflow-hidden rounded-t-lg">
              <img
                src={course.thumbnail || "/placeholder.svg"}
                alt={course.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <CardHeader>
            <CardTitle className="text-balance">{course.title}</CardTitle>
            <CardDescription className="line-clamp-2">{course.description}</CardDescription>
          </CardHeader>
          <CardContent className="mt-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Layers className="h-4 w-4" />
                <span>{course.scenes?.length || 0} сцен</span>
              </div>
              <Link href={`/dashboard/courses/${course.id}`}>
                <Button size="sm">Розпочати</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
