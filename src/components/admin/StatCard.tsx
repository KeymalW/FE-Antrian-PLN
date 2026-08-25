import type { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '../ui/card'
import { Skeleton } from '../ui/skeleton'
import { cn } from '../../lib/utils'

export type StatTone = 'neutral' | 'amber' | 'blue' | 'emerald' | 'green' | 'gray'

const TONE_TILE: Record<StatTone, string> = {
  neutral: 'bg-muted text-foreground',
  amber: 'bg-amber-50 text-amber-600 ring-1 ring-amber-100',
  blue: 'bg-blue-50 text-blue-600 ring-1 ring-blue-100',
  emerald: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100',
  green: 'bg-green-50 text-green-700 ring-1 ring-green-100',
  gray: 'bg-muted text-muted-foreground',
}

interface StatCardProps {
  label: string
  value: number
  icon: LucideIcon
  tone?: StatTone
  loading?: boolean
}

export function StatCard({ label, value, icon: Icon, tone = 'neutral', loading = false }: StatCardProps) {
  return (
    <Card size="sm">
      <CardContent className="flex items-center gap-3">
        <div
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-lg',
            TONE_TILE[tone]
          )}
        >
          <Icon className="size-4" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          {loading ? (
            <>
              <Skeleton className="h-5 w-10" />
              <Skeleton className="mt-1.5 h-3 w-14" />
            </>
          ) : (
            <>
              <div className="text-xl leading-none font-semibold tabular-nums text-foreground">
                {value}
              </div>
              <div className="mt-1 truncate text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                {label}
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
