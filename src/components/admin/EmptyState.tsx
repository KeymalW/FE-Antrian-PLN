import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: ReactNode
  compact?: boolean
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact = false,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-6 text-center',
        compact ? 'py-8' : 'py-12',
        className
      )}
    >
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-card text-muted-foreground ring-1 ring-border',
          compact ? 'size-9' : 'size-11'
        )}
      >
        <Icon className={compact ? 'size-4' : 'size-5'} aria-hidden="true" />
      </div>
      <p className={cn('mt-3 font-medium text-foreground', compact ? 'text-sm' : 'text-base')}>
        {title}
      </p>
      {description && (
        <p className="mt-1 max-w-sm text-xs text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
