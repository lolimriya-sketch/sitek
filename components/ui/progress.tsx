'use client'

import * as React from 'react'
import * as ProgressPrimitive from '@radix-ui/react-progress'

import { cn } from '@/lib/utils'

function Progress({
  className,
  value,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  const rootRef = React.useRef<HTMLDivElement | null>(null)
  const [indicatorWidth, setIndicatorWidth] = React.useState<number>(0)

  React.useEffect(() => {
    const el = rootRef.current
    if (!el) return

    function update() {
      const w = el.clientWidth || 0
      const pct = Math.min(Math.max(Number(value || 0), 0), 100) / 100
      setIndicatorWidth(Math.round(w * pct))
    }

    update()

    // Resize observer to update on container resize
    let ro: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => update())
      ro.observe(el)
    }

    return () => {
      if (ro && el) ro.unobserve(el)
    }
  }, [value])

  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      ref={rootRef}
      className={cn('bg-primary/20 relative h-2 w-full overflow-hidden rounded-full', className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="bg-primary h-full transition-all"
        style={{ width: `${indicatorWidth}px` }}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }
