"use client"

import type { Course, CourseProgress } from "@/lib/types"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RotateCcw, Clock } from "lucide-react"
import Link from "next/link"

interface CompletedCoursesTableProps {
  items: { progress: CourseProgress; course: Course | null }[]
}

export function CompletedCoursesTable({ items }: CompletedCoursesTableProps) {
  function formatDuration(seconds: number) {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}хв ${remainingSeconds}с`
  }

  if (items.length === 0) {
    return (
      <div className="border rounded-lg p-12">
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold">Немає завершених курсів</h3>
          <p className="text-muted-foreground">Пройдені курси з'являться тут після завершення</p>
        </div>
      </div>
    )
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Курс</TableHead>
            <TableHead>Дата завершення</TableHead>
            <TableHead>Тривалість</TableHead>
            <TableHead>Виходи з вкладки</TableHead>
            <TableHead>Статус</TableHead>
            <TableHead className="w-[100px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map(({ progress, course }) => (
            <TableRow key={progress.id}>
              <TableCell className="font-medium">{course?.title || "Невідомий курс"}</TableCell>
              <TableCell>
                {progress.completedAt
                  ? new Date(progress.completedAt).toLocaleDateString("uk-UA", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "-"}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  {formatDuration(progress.duration)}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={progress.tabExits > 3 ? "destructive" : "secondary"}>{progress.tabExits}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant="default">Завершено</Badge>
              </TableCell>
              <TableCell>
                {course && (
                  <Link href={`/dashboard/courses/${course.id}`}>
                    <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                      <RotateCcw className="h-4 w-4" />
                      Пройти знову
                    </Button>
                  </Link>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
