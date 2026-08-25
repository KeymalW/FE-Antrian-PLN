import { useEffect, useState, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { getTrashedTickets, restoreTicket, emptyTrash, clearQueueHistory } from '../services/queue'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Skeleton } from '../components/ui/skeleton'
import { PageHeader } from '../components/admin/PageHeader'
import { EmptyState } from '../components/admin/EmptyState'
import {
  RotateCcwIcon,
  RefreshCwIcon,
  SettingsIcon,
  Trash2Icon,
  TriangleAlertIcon,
  Undo2Icon,
  Building2Icon,
  MonitorPlayIcon,
  TicketIcon,
} from 'lucide-react'
import { cn } from '../lib/utils'
import { getServiceLabel } from '../lib/serviceTypes'
import { formatDateTimeId } from '../lib/datetime'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog'
import { IdentityTab } from '../components/settings/IdentityTab'
import { MediaTab } from '../components/settings/MediaTab'
import { TicketTab } from '../components/settings/TicketTab'
import type { QueueTicket } from '../types/queue'

const TABS = [
  { key: 'general', label: 'Umum', icon: SettingsIcon },
  { key: 'identity', label: 'Identitas', icon: Building2Icon },
  { key: 'media', label: 'Media TV', icon: MonitorPlayIcon },
  { key: 'ticket', label: 'Tiket', icon: TicketIcon },
  { key: 'trash', label: 'Tempat Sampah', icon: Trash2Icon },
] as const

type TabKey = (typeof TABS)[number]['key']

function TabButton({
  active,
  ...props
}: React.ComponentProps<'button'> & { active: boolean }) {
  return (
    <button
      type="button"
      data-active={active}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all',
        active
          ? 'bg-card text-foreground shadow-sm ring-1 ring-border'
          : 'text-muted-foreground hover:text-foreground'
      )}
      {...props}
    />
  )
}

function GeneralTab() {
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const handleReset = async () => {
    setActionLoading('reset')
    try {
      await clearQueueHistory()
    } catch {
      toast.error('Gagal mereset antrian')
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="space-y-4">
      <Card className="border-destructive/25">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TriangleAlertIcon className="size-4 text-destructive" aria-hidden="true" />
            Reset Semua Antrian
          </CardTitle>
          <CardDescription>
            Menghapus semua tiket yang sudah selesai atau dilewati dari sistem.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="destructive" className="w-full sm:w-auto">
                <RotateCcwIcon data-icon="inline-start" />
                Reset Semua Antrian
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reset Semua Antrian</DialogTitle>
                <DialogDescription>
                  Apakah kamu yakin? Semua antrian yang sudah selesai atau dilewati akan dihapus.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Batal</Button>
                </DialogClose>
                <Button
                  variant="destructive"
                  onClick={handleReset}
                  disabled={actionLoading === 'reset'}
                >
                  {actionLoading === 'reset' ? 'Mereset...' : 'Ya, Reset'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  )
}

function TrashTab() {
  const [tickets, setTickets] = useState<QueueTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const fetchIdRef = useRef(0)

  const fetchTrash = useCallback(async () => {
    const id = ++fetchIdRef.current
    try {
      const data = await getTrashedTickets()
      if (id !== fetchIdRef.current) return
      setTickets(data)
    } catch {
      if (import.meta.env.DEV) console.error('Failed to fetch trash')
      toast.error('Gagal memuat tempat sampah')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => void fetchTrash(), 0)
    return () => window.clearTimeout(timer)
  }, [fetchTrash])

  const handleRestore = async (ticketId: string) => {
    setActionLoading(ticketId)
    try {
      await restoreTicket(ticketId)
      await fetchTrash()
    } catch {
      toast.error('Gagal memulihkan tiket')
    } finally {
      setActionLoading(null)
    }
  }

  const handleEmptyTrash = async () => {
    setActionLoading('empty-all')
    try {
      await emptyTrash()
      await fetchTrash()
    } catch {
      toast.error('Gagal mengosongkan tempat sampah')
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-4 space-y-0 [.border-b]:pb-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            Tempat Sampah
            {!loading && (
              <Badge variant="secondary" className="tabular-nums">
                {tickets.length}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>Tiket yang sudah selesai atau dilewati.</CardDescription>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchTrash()}
            disabled={loading}
          >
            <RefreshCwIcon className={loading ? 'animate-spin' : ''} data-icon="inline-start" />
            Refresh
          </Button>
          {tickets.length > 0 && (
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={actionLoading === 'empty-all'}
                >
                  <Trash2Icon data-icon="inline-start" />
                  Kosongkan
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Kosongkan Tempat Sampah?</DialogTitle>
                  <DialogDescription>
                    Semua tiket di tempat sampah akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant="destructive"
                    onClick={handleEmptyTrash}
                    disabled={actionLoading === 'empty-all'}
                  >
                    {actionLoading === 'empty-all' ? (
                      <RefreshCwIcon className="animate-spin" />
                    ) : (
                      <Trash2Icon />
                    )}
                    Hapus Semua
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-[4.5rem] w-full rounded-xl" />
            ))}
          </div>
        ) : tickets.length === 0 ? (
          <EmptyState
            icon={Trash2Icon}
            title="Tempat sampah kosong"
            description="Tiket yang sudah selesai atau dilewati akan muncul di sini."
          />
        ) : (
          <div className="space-y-2">
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3 transition-colors hover:bg-muted/40"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold tabular-nums text-foreground">
                      {ticket.queueNumber}
                    </div>
                    <div className="truncate text-xs text-muted-foreground capitalize">
                      {getServiceLabel(ticket.serviceType)}
                      {ticket.counterNumber && ` • Loket ${ticket.counterNumber}`}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {ticket.status === 'completed' ? 'Selesai' : 'Dilewati'} •{' '}
                      <span className="tabular-nums whitespace-nowrap">{formatDateTimeId(ticket.completedAt ?? ticket.calledAt)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant={ticket.status === 'completed' ? 'default' : 'destructive'}>
                    {ticket.status === 'completed' ? 'Selesai' : 'Dilewati'}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRestore(ticket.id)}
                    disabled={actionLoading === ticket.id}
                  >
                    {actionLoading === ticket.id ? (
                      <RefreshCwIcon className="animate-spin" />
                    ) : (
                      <Undo2Icon />
                    )}
                    Pulihkan
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function AdminSettings() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab: TabKey = (TABS.find((t) => t.key === searchParams.get('tab'))?.key ?? 'general')

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <PageHeader
        title="Pengaturan"
        description="Kelola identitas instansi, media TV, tiket, dan pengaturan sistem."
      />

      <div
        role="tablist"
        aria-label="Kategori pengaturan"
        className="inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-xl bg-muted p-1"
      >
        {TABS.map(({ key, label, icon: Icon }) => (
          <TabButton
            key={key}
            active={activeTab === key}
            aria-selected={activeTab === key}
            role="tab"
            onClick={() => setSearchParams({ tab: key })}
          >
            <Icon className="size-3.5 shrink-0" aria-hidden="true" />
            {label}
          </TabButton>
        ))}
      </div>

      <div role="tabpanel">
        {activeTab === 'general' && <GeneralTab />}
        {activeTab === 'identity' && <IdentityTab />}
        {activeTab === 'media' && <MediaTab />}
        {activeTab === 'ticket' && <TicketTab />}
        {activeTab === 'trash' && <TrashTab />}
      </div>
    </div>
  )
}
