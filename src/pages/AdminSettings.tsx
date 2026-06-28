import { useEffect, useState, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { getTrashedTickets, restoreTicket, emptyTrash, clearQueueHistory } from '../services/queue'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Skeleton } from '../components/ui/skeleton'
import { ScrollArea } from '../components/ui/scroll-area'
import {
  RotateCcwIcon,
  RefreshCwIcon,
  Trash2Icon,
  Undo2Icon,
  AlertTriangleIcon,
  SettingsIcon,
} from 'lucide-react'
import { getServiceLabel } from '../lib/serviceTypes'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog'
import type { QueueTicket } from '../types/queue'

const TABS = [
  { key: 'general', label: 'Umum' },
  { key: 'trash', label: 'Tempat Sampah' },
] as const

type TabKey = (typeof TABS)[number]['key']

function formatClock(value: string | null) {
  if (!value) return '--:--'
  return new Date(value).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function TabButton({
  active,
  ...props
}: React.ComponentProps<'button'> & { active: boolean }) {
  return (
    <button
      type="button"
      data-active={active}
      className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
        active
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
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
      <Card>
        <CardHeader>
          <CardTitle>Pengaturan Umum</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="destructive" className="w-full">
                <RotateCcwIcon className="mr-2 size-4" />
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
          <p className="text-xs text-muted-foreground">
            Menghapus semua tiket yang sudah selesai atau dilewati dari sistem.
          </p>
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
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <Trash2Icon className="size-5 text-muted-foreground" />
          Tempat Sampah
        </CardTitle>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchTrash()}
            disabled={loading}
          >
            <RefreshCwIcon className={`mr-2 size-4 ${loading ? 'animate-spin' : ''}`} />
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
                  <Trash2Icon className="mr-2 size-4" />
                  Kosongkan
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <AlertTriangleIcon className="size-5 text-destructive" />
                    Kosongkan Tempat Sampah?
                  </DialogTitle>
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
                      <RefreshCwIcon className="mr-2 size-4 animate-spin" />
                    ) : (
                      <Trash2Icon className="mr-2 size-4" />
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
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : tickets.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <Trash2Icon className="mx-auto mb-3 size-10 opacity-30" />
            <p className="text-lg font-medium">Tempat sampah kosong</p>
            <p className="text-sm">Tiket yang sudah selesai atau dilewati akan muncul di sini.</p>
          </div>
        ) : (
          <>
            <p className="mb-3 text-sm text-muted-foreground">
              {tickets.length} tiket di tempat sampah
            </p>
            <ScrollArea className="h-[32rem] pr-3">
              <div className="space-y-2">
                {tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="flex items-center justify-between rounded-lg border px-4 py-3"
                  >
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="font-semibold text-foreground">
                          {ticket.queueNumber}
                        </div>
                        <div className="text-xs capitalize text-muted-foreground">
                          {getServiceLabel(ticket.serviceType)}
                          {ticket.counterNumber && ` • Loket ${ticket.counterNumber}`}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {ticket.status === 'completed' ? 'Selesai' : 'Dilewati'} • {formatClock(ticket.completedAt ?? ticket.calledAt)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
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
                          <RefreshCwIcon className="size-4 animate-spin" />
                        ) : (
                          <Undo2Icon className="size-4" />
                        )}
                        <span className="ml-1">Pulihkan</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default function AdminSettings() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab: TabKey = (TABS.find((t) => t.key === searchParams.get('tab'))?.key ?? 'general')

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6 flex items-center gap-3">
        <SettingsIcon className="size-6 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-bold">Pengaturan</h1>
          <p className="text-sm text-muted-foreground">
            Kelola pengaturan sistem dan tempat sampah
          </p>
        </div>
      </div>

      <div className="mb-6 flex gap-2 border-b pb-2">
        {TABS.map((tab) => (
          <TabButton
            key={tab.key}
            active={activeTab === tab.key}
            onClick={() => setSearchParams({ tab: tab.key })}
          >
            {tab.label}
          </TabButton>
        ))}
      </div>

      {activeTab === 'general' && <GeneralTab />}
      {activeTab === 'trash' && <TrashTab />}
    </div>
  )
}