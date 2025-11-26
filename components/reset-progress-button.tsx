"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
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
import { RotateCcw } from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

interface ResetProgressButtonProps {
  progressId: string
  userName: string
}

export function ResetProgressButton({ progressId, userName }: ResetProgressButtonProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [showDialog, setShowDialog] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleReset() {
    setLoading(true)
    try {
      const res = await fetch('/api/progress')
      const list = res.ok ? await res.json() : []
      const filtered = (list || []).filter((p: any) => p.id !== progressId)
      const save = await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progress: filtered }),
      })
      const result = await save.json()
      if (save.ok && result.success !== false) {
        toast({ title: 'Прогрес скинуто', description: `${userName} зможе пройти курс повторно` })
        setShowDialog(false)
        router.refresh()
      } else {
        toast({ variant: 'destructive', title: 'Помилка', description: result.error || 'Не вдалося скинути прогрес' })
      }
    } catch (err) {
      toast({ variant: 'destructive', title: 'Помилка', description: 'Не вдалося скинути прогрес' })
    }
    setLoading(false)
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setShowDialog(true)} className="gap-2">
        <RotateCcw className="h-4 w-4" />
        Скинути прогрес
      </Button>

      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Скинути прогрес курсу?</AlertDialogTitle>
            <AlertDialogDescription>
              Це дозволить {userName} пройти курс повторно. Поточний прогрес буде видалено.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset} disabled={loading}>
              {loading ? "Скидання..." : "Скинути"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
