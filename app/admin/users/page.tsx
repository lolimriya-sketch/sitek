import { getAllUsersExceptMainAdmin } from "@/lib/auth"
import { UsersTable } from "@/components/users-table"
import { CreateUserDialog } from "@/components/create-user-dialog"

export default async function UsersPage() {
  const users = getAllUsersExceptMainAdmin()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Користувачі</h1>
          <p className="text-muted-foreground mt-1">Управління користувачами та їх ролями</p>
        </div>
        <CreateUserDialog />
      </div>
      <UsersTable users={users} />
    </div>
  )
}
