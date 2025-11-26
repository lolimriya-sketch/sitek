import { ContactAdmin } from "@/components/contact-admin"

export default function ContactPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Контакт з адміністратором</h1>
        <p className="text-muted-foreground mt-1">Зв'яжіться з адміністратором через голосовий дзвінок</p>
      </div>
      <ContactAdmin />
    </div>
  )
}
