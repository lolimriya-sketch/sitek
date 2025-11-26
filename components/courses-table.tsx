"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import type { Course } from "@/lib/types"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreVertical, Edit, Trash2, Eye, UserPlus, BarChart3 } from "lucide-react"
// using API endpoints instead of Server Actions for client interactions
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { AssignCourseDialog } from "@/components/assign-course-dialog"

interface CoursesTableProps {
  courses: Course[]
}

export function CoursesTable({ courses }: CoursesTableProps) {
  const router = useRouter()
  const [deleteCourseId, setDeleteCourseId] = useState<string | null>(null)
  const [assignCourseId, setAssignCourseId] = useState<string | null>(null)

  async function handleDelete(courseId: string) {
    try {
      const res = await fetch(`/api/courses?id=${encodeURIComponent(courseId)}`, { method: "DELETE" })
      const result = await res.json()
      if (res.ok && result.success) {
        setDeleteCourseId(null)
        router.refresh()
      }
    } catch (e) {
      // ignore
    }
  }

  async function togglePublish(course: Course) {
    try {
      const res = await fetch(`/api/courses`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: course.id, updates: { published: !course.published } }),
      })
      const result = await res.json()
      if (res.ok && result.success) router.refresh()
    } catch (e) {
      // ignore
    }
  }

  return (
    <>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Назва</TableHead>
              <TableHead>Опис</TableHead>
              <TableHead>Сцени</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Оновлено</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {courses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Немає курсів. Створіть перший курс.
                </TableCell>
              </TableRow>
            ) : (
              courses.map((course) => (
                <TableRow key={course.id}>
                  <TableCell className="font-medium">{course.title}</TableCell>
                  <TableCell className="max-w-md truncate">{course.description}</TableCell>
                  <TableCell className="text-muted-foreground">{course.scenes?.length || 0}</TableCell>
                  <TableCell>
                    <Badge variant={course.published ? "default" : "secondary"}>
                      {course.published ? "Опубліковано" : "Чернетка"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(course.updatedAt).toLocaleDateString("uk-UA")}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/courses/${course.id}`}>
                            <Edit className="h-4 w-4 mr-2" />
                            Редагувати
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/courses/${course.id}/analytics`}>
                            <BarChart3 className="h-4 w-4 mr-2" />
                            Аналітика
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setAssignCourseId(course.id)}>
                          <UserPlus className="h-4 w-4 mr-2" />
                          Призначити користувачам
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => togglePublish(course)}>
                          <Eye className="h-4 w-4 mr-2" />
                          {course.published ? "Зняти з публікації" : "Опублікувати"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setDeleteCourseId(course.id)} className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Видалити
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteCourseId} onOpenChange={() => setDeleteCourseId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Підтвердіть видалення</AlertDialogTitle>
            <AlertDialogDescription>
              Ви впевнені, що хочете видалити цей курс? Цю дію неможливо скасувати.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteCourseId && handleDelete(deleteCourseId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Видалити
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {assignCourseId && (
        <AssignCourseDialog
          courseId={assignCourseId}
          open={!!assignCourseId}
          onOpenChange={(open) => !open && setAssignCourseId(null)}
        />
      )}
    </>
  )
}
