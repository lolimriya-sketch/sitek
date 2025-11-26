
'use client'

import { useToast as __useToast, toast as __toast } from '@/components/ui/use-toast'

export function useToast() {
  return __useToast()
}

export const toast = __toast
