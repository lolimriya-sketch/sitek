import { requireAdmin } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChangePasswordForm } from "@/components/change-password-form"

export default async function ProfilePage() {
  const user = await requireAdmin()

  // Only main admin can access this page
  if (user.id !== "admin-1") {
    redirect("/admin")
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Профіль головного адміністратора</h1>
        <p className="text-muted-foreground mt-2">Керуйте налаштуваннями вашого облікового запису</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Інформація про обліковий запис</CardTitle>
          <CardDescription>Ваші дані для входу</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="text-sm font-medium text-muted-foreground">Email</div>
            <div className="text-base">{user.email}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">Ім'я</div>
            <div className="text-base">{user.name}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">Роль</div>
            <div className="text-base">Головний адміністратор</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Зміна пароля</CardTitle>
          <CardDescription>Оновіть пароль для вашого облікового запису</CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm userId={user.id} />
        </CardContent>
      </Card>
    </div>
  )
}
