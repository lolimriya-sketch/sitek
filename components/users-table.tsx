"use client"

import { useState } from "react"
import type { User } from "@/lib/types"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreVertical, Shield, UserIcon, Trash2, Pencil } from "lucide-react"
// using REST API instead of server actions
import { useRouter } from "next/navigation"
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
import { EditUserDialog } from "@/components/edit-user-dialog"

interface UsersTableProps {
  users: User[]
}

export function UsersTable({ users }: UsersTableProps) {
  const router = useRouter()
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null)
  const [editUser, setEditUser] = useState<User | null>(null)

  async function handleRoleChange(userId: string, role: "admin" | "user") {
    try {
      const res = await fetch('/api/users')
      const users = res.ok ? await res.json() : []
      const updated = users.map((u: any) => (u.id === userId ? { ...u, role } : u))
      await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users: updated }),
      })
      router.refresh()
    } catch (err) {
      router.refresh()
    }
  }

  async function handleDelete(userId: string) {
    try {
      const res = await fetch('/api/users')
      const users = res.ok ? await res.json() : []
      const updated = users.filter((u: any) => u.id !== userId)
      await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users: updated }),
      })
      setDeleteUserId(null)
      router.refresh()
    } catch (err) {
      setDeleteUserId(null)
      router.refresh()
    }
  }

  return (
    <>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ім'я</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Роль</TableHead>
              <TableHead>Створено</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                    {user.role === "admin" ? "Адміністратор" : "Користувач"}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(user.createdAt).toLocaleDateString("uk-UA")}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditUser(user)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Редагувати
                      </DropdownMenuItem>
                      {user.role === "user" ? (
                        <DropdownMenuItem onClick={() => handleRoleChange(user.id, "admin")}>
                          <Shield className="h-4 w-4 mr-2" />
                          Зробити адміном
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => handleRoleChange(user.id, "user")}>
                          <UserIcon className="h-4 w-4 mr-2" />
                          Зробити користувачем
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => setDeleteUserId(user.id)} className="text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Видалити
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Підтвердіть видалення</AlertDialogTitle>
            <AlertDialogDescription>
              Ви впевнені, що хочете видалити цього користувача? Цю дію неможливо скасувати.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteUserId && handleDelete(deleteUserId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Видалити
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {editUser && <EditUserDialog user={editUser} open={!!editUser} onClose={() => setEditUser(null)} />}
    </>
  )
}
