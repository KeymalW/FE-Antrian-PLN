import { useEffect, useState, useCallback, useRef, lazy, Suspense } from 'react'
import { toast } from 'sonner'
import { useAuthStore } from '../store/authStore'
import { useQueueStore, getGroupForServiceType, hasAnyActiveCall, canCallServiceType } from '../store/queueStore'
import { useWebSocket } from '../hooks/useWebSocket'
import { useQueueSound } from '../hooks/useQueueSound'
import {
  getQueueList,
  getQueueStats,
  getWeeklyQueueList,
  callQueue,
  skipQueue,
  completeQueue,
  clearQueueHistory,
} from '../services/queue'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Skeleton } from '../components/ui/skeleton'
import { Spinner } from '../components/ui/spinner'
import { ScrollArea } from '../components/ui/scroll-area'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '../components/ui/dialog'
import type { QueueTicket, QueueStats, QueueStatus, ServiceType } from '../types/queue'
import { ChevronDownIcon, ChevronUpIcon, BarChart3Icon, Trash2Icon, KeyboardIcon, VolumeIcon } from 'lucide-react'
import {
  getServiceLabel,
  getServiceSortScore,
  SERVICE_STATUS_LABELS,
  STATUS_BADGE_COLOR,
  SERVICE_GROUP_LABELS,
  getServiceGroup,
  type ServiceGroup,
} from '../lib/serviceTypes'
import { buildWeeklyCounterChartData, type WeeklyServiceChartRow } from '../lib/weeklyCounterChart'

const ServiceSummaryChart = lazy(() =>
  import('../components/dashboard/ServiceSummaryChart').then((module) => ({
    default: module.ServiceSummaryChart,
  })),
)

const ALL_GROUPS: ServiceGroup[] = ['group_a', 'group_b']

function QueueStatusBadge({ status }: { status: QueueStatus }) {
  return <Badge className={STATUS_BADGE_COLOR[status]}>{SERVICE_STATUS_LABELS[status]}</Badge>
}

function CardSkeleton() {
  return (
    <Card size="sm">
      <CardContent className="text-center">
        <Skeleton className="mx-auto mb-2 h-5 w-1/3" />
        <Skeleton className="mx-auto h-4 w-2/3" />
      </CardContent>
    </Card>
  )
}

function formatClock(value: string | null) {
  if (!value) return '--:--'
  return new Date(value).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatElapsed(start: string | null, now: Date) {
  if (!start) return '--:--'

  const diff = Math.max(0, now.getTime() - new Date(start).getTime())
  const totalSeconds = Math.floor(diff / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function sortRecentCompleted(tickets: QueueTicket[]) {
  return [...tickets].sort((a, b) => {
    const aTime = a.completedAt ?? a.createdAt
    const bTime = b.completedAt ?? b.createdAt
    return bTime.localeCompare(aTime)
  })
}

function sortWaitingTickets(tickets: QueueTicket[]) {
  return [...tickets].sort((a, b) => {
    const aScore = getServiceSortScore(a.serviceType)
    const bScore = getServiceSortScore(b.serviceType)

    if (aScore.group !== bScore.group) return aScore.group - bScore.group
    if (aScore.order !== bScore.order) return aScore.order - bScore.order

    const queueCompare = a.queueNumber.localeCompare(b.queueNumber, 'id', {
      numeric: true,
      sensitivity: 'base',
    })

    if (queueCompare !== 0) return queueCompare

    return a.createdAt.localeCompare(b.createdAt)
  })
}

function ActiveCallCard({
  group,
  ticket,
  now,
  actionLoading,
  onComplete,
  onRecall,
  onSkip,
}: {
  group: ServiceGroup
  ticket: QueueTicket | null
  now: Date
  actionLoading: string | null
  onComplete: (id: string) => void
  onRecall: (ticket: QueueTicket) => void
  onSkip: (id: string) => void
}) {
  const groupLabel = SERVICE_GROUP_LABELS[group]

  if (!ticket) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 p-4 text-center">
        <div className="text-xs font-medium text-muted-foreground">{groupLabel}</div>
        <div className="mt-1 text-sm text-muted-foreground">Tidak ada</div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 text-center">
      <div className="text-xs font-medium text-muted-foreground">{groupLabel}</div>
      <div className="mt-2 text-3xl font-bold text-green-600">{ticket.queueNumber}</div>
      <div className="mt-1 text-sm capitalize text-muted-foreground">
        {getServiceLabel(ticket.serviceType)}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">
        Loket #{ticket.counterNumber}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">
        {formatClock(ticket.calledAt)} • {formatElapsed(ticket.calledAt, now)}
      </div>
      <div className="mt-3 flex justify-center gap-2">
        <Button
          size="sm"
          onClick={() => onComplete(ticket.id)}
          disabled={actionLoading === ticket.id}
        >
          {actionLoading === ticket.id && <Spinner data-icon="inline-start" />}
          Selesai
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onRecall(ticket)}
        >
          Panggil Ulang
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="bg-gray-100 text-gray-800 hover:bg-gray-200"
          onClick={() => onSkip(ticket.id)}
        >
          Skip
        </Button>
      </div>
    </div>
  )
}

export default function PetugasDashboard() {
  const { user } = useAuthStore()
  const { queueList, setQueueList, stats, setStats, activeCalls, setActiveCall, counterStatus, setCounterStatus } = useQueueStore()
  const { playBeep, unlockAudio, announceQueueCall } = useQueueSound()
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [recentCompleted, setRecentCompleted] = useState<QueueTicket[]>([])
  const [serviceSummary, setServiceSummary] = useState<WeeklyServiceChartRow[]>([])
  const [showServiceSummary, setShowServiceSummary] = useState(false)
  const [now, setNow] = useState(new Date())

  const counterNumber = user?.counterNumber ?? 1
  const isCounterPaused = counterStatus[counterNumber] ?? false
  const anyActive = hasAnyActiveCall(activeCalls)
  const fetchIdRef = useRef(0)

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const fetchData = useCallback(async () => {
    const id = ++fetchIdRef.current
    try {
      const [list, statsData, calledTickets, servingTickets, completed, allTickets] = await Promise.all([
        getQueueList({ status: 'waiting' }),
        getQueueStats(),
        getQueueList({ status: 'called' }),
        getQueueList({ status: 'serving' }),
        getQueueList({ status: 'completed', perPage: 10 }),
        getWeeklyQueueList(),
      ])
      if (id !== fetchIdRef.current) return

      setQueueList(sortWaitingTickets(list))
      setStats(statsData)

      const allActive = [...calledTickets, ...servingTickets]
      for (const group of ALL_GROUPS) {
        const match = allActive.find(
          (t) => getServiceGroup(t.serviceType as ServiceType) === group,
        )
        setActiveCall(group, match ?? null)
      }

      setRecentCompleted(sortRecentCompleted(completed))
      setServiceSummary(buildWeeklyCounterChartData(allTickets))
    } catch {
      if (import.meta.env.DEV) console.error('Failed to fetch queue data')
      toast.error('Gagal memuat data antrian')
    } finally {
      setLoading(false)
    }
  }, [setQueueList, setStats, setActiveCall])

  useWebSocket({
    onQueueUpdate: () => {
      fetchData()
    },
    onQueueCall: (msg) => {
      const payload = msg.payload as QueueTicket
      if (payload.counterNumber === counterNumber) {
        const group = getGroupForServiceType(payload.serviceType as ServiceType)
        setActiveCall(group, payload)
        announceQueueCall(payload)
      }
      fetchData()
    },
    onQueueComplete: () => {
      fetchData()
    },
    onQueueSkip: () => {
      fetchData()
    },
    onStatsUpdate: (msg) => {
      setStats(msg.payload as QueueStats)
    },
  })

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchData()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [fetchData])

  const handleCall = async (queueId: string) => {
    if (isCounterPaused) {
      playBeep()
      return
    }

    const ticket = queueList.find((t) => t.id === queueId)
    if (!ticket) return

    if (!canCallServiceType(activeCalls, ticket.serviceType as ServiceType)) {
      const group = getGroupForServiceType(ticket.serviceType as ServiceType)
      toast.error(`Masih ada tiket aktif di ${SERVICE_GROUP_LABELS[group]}. Selesaikan terlebih dahulu.`)
      playBeep()
      return
    }

    setActionLoading(queueId)
    try {
      const result = await callQueue({ queueId, counterNumber })
      const group = getGroupForServiceType(result.serviceType as ServiceType)
      setActiveCall(group, result)
      announceQueueCall(result)
      await fetchData()
    } catch {
      playBeep()
      toast.error('Gagal memanggil antrian')
    } finally {
      setActionLoading(null)
    }
  }

  const handleSkip = async (queueId: string) => {
    setActionLoading(queueId)
    try {
      await skipQueue(queueId)
      await fetchData()
    } catch {
      toast.error('Gagal melewati antrian')
    } finally {
      setActionLoading(null)
    }
  }

  const handleComplete = async (queueId: string) => {
    setActionLoading(queueId)
    try {
      await completeQueue(queueId)
      await fetchData()
    } catch {
      toast.error('Gagal menyelesaikan antrian')
    } finally {
      setActionLoading(null)
    }
  }

  const handleRecall = (ticket: QueueTicket) => {
    announceQueueCall(ticket)
  }

  const handleClearHistory = async () => {
    setActionLoading('clear-history')
    try {
      await clearQueueHistory()
      await fetchData()
    } catch {
      toast.error('Gagal menghapus riwayat antrian')
    } finally {
      setActionLoading(null)
    }
  }

  const [showShortcutHelp, setShowShortcutHelp] = useState(false)
  const [audioUnlocked, setAudioUnlocked] = useState(false)

  const handleUnlockAudio = async () => {
    await unlockAudio()
    setAudioUnlocked(true)
  }

  const findNextCallable = () => {
    for (const ticket of queueList) {
      if (canCallServiceType(activeCalls, ticket.serviceType as ServiceType)) {
        return ticket
      }
    }
    return null
  }

  const firstActiveTicket = activeCalls.group_a ?? activeCalls.group_b

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      switch (e.key) {
        case 'c':
        case 'C':
        case ' ': {
          e.preventDefault()
          if (isCounterPaused || queueList.length === 0) break
          const next = findNextCallable()
          if (next) {
            unlockAudio()
            handleCall(next.id)
          } else {
            toast.info('Tidak ada antrian yang bisa dipanggil')
          }
          break
        }
        case 's':
        case 'S':
          e.preventDefault()
          if (queueList.length > 0) {
            handleSkip(queueList[0].id)
          }
          break
        case 'Enter':
          if (firstActiveTicket) {
            e.preventDefault()
            unlockAudio()
            handleComplete(firstActiveTicket.id)
          }
          break
        case 'r':
        case 'R':
          if (firstActiveTicket) {
            e.preventDefault()
            unlockAudio()
            handleRecall(firstActiveTicket)
          }
          break
        case 'i':
        case 'I':
          e.preventDefault()
          setCounterStatus(counterNumber, !isCounterPaused)
          break
        case '?':
          e.preventDefault()
          setShowShortcutHelp((p) => !p)
          break
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isCounterPaused, queueList, activeCalls, counterNumber, firstActiveTicket])

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Audio Unlock Overlay */}
      {!audioUnlocked && (
        <div
          className="fixed inset-0 z-50 flex cursor-pointer items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={handleUnlockAudio}
        >
          <div className="flex flex-col items-center gap-6 rounded-2xl bg-white px-12 py-10 shadow-2xl">
            <div className="rounded-full bg-pln-cyan/20 p-5">
              <VolumeIcon className="size-12 text-pln-cyan" />
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900">Aktifkan Suara</h2>
              <p className="mt-2 text-base text-gray-500">
                Klik di mana saja untuk mengaktifkan suara antrian
              </p>
            </div>
            <div className="animate-pulse text-sm text-gray-400">
              Ketuk layar untuk melanjutkan
            </div>
          </div>
        </div>
      )}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard Petugas</h1>
          <p className="text-sm text-muted-foreground">
            Loket #{counterNumber} — {user?.name}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            className={isCounterPaused ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}
          >
            {isCounterPaused ? 'Loket Istirahat' : 'Loket Aktif'}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCounterStatus(counterNumber, !isCounterPaused)}
          >
            {isCounterPaused ? 'Aktifkan Loket' : 'Istirahat Loket'}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setShowShortcutHelp(true)}
            title="Pintasan Keyboard (?)"
          >
            <KeyboardIcon className="size-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {stats
          ? <StatCards stats={stats} />
          : Array.from({ length: 5 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Antrian Menunggu ({queueList.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {isCounterPaused && (
                <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  Loket sedang istirahat. Tombol Panggil dinonaktifkan sementara.
                </div>
              )}

              {anyActive && !isCounterPaused && (
                <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                  Selesaikan antrian yang sedang dilayani terlebih dahulu. Hanya antrian dari layanan berbeda yang bisa dipanggil bersamaan.
                </div>
              )}

              {loading ? (
                <div className="flex flex-col gap-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <CardSkeleton key={i} />
                  ))}
                </div>
              ) : queueList.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <p className="text-lg font-medium">Tidak ada antrian</p>
                  <p className="text-sm">Semua antrian sudah selesai</p>
                </div>
              ) : (
                <ScrollArea className="h-[16rem] pr-3">
                  {queueList.map((q) => {
                    const ticketGroup = getGroupForServiceType(q.serviceType as ServiceType)
                    const isBlocked = !canCallServiceType(activeCalls, q.serviceType as ServiceType)

                    return (
                      <div
                        key={q.id}
                        className="grid gap-3 border-b py-3 last:border-b-0 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
                      >
                        <div className="grid min-w-0 grid-cols-[4.5rem_minmax(0,12rem)_auto] items-center gap-3">
                          <span className="text-lg font-bold tabular-nums text-primary">
                            {q.queueNumber}
                          </span>
                          <div className="min-w-0 flex flex-col">
                            <span className="truncate text-sm capitalize text-muted-foreground">
                              {getServiceLabel(q.serviceType)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Dicetak {formatClock(q.createdAt)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <QueueStatusBadge status={q.status} />
                            {isBlocked && (
                              <Badge className="bg-amber-100 text-amber-700 text-[10px]">
                                {SERVICE_GROUP_LABELS[ticketGroup]}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 md:justify-end">
                          <Button
                            size="sm"
                            onClick={() => handleCall(q.id)}
                            disabled={actionLoading === q.id || isCounterPaused || isBlocked}
                          >
                            {actionLoading === q.id && <Spinner data-icon="inline-start" />}
                            Panggil
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="bg-gray-100 text-gray-800 hover:bg-gray-200"
                            onClick={() => handleSkip(q.id)}
                          >
                            Skip
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          <Card className="mt-6 rounded-2xl shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3Icon className="size-5 text-pln-cyan" />
                  Perbandingan Loket Mingguan
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Distribusi tiket per loket untuk hari kerja Senin sampai Jumat.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowServiceSummary((prev) => !prev)}
              >
                {showServiceSummary ? <ChevronUpIcon /> : <ChevronDownIcon />}
                {showServiceSummary ? 'Minimize' : 'Buka Diagram'}
              </Button>
            </CardHeader>
            {showServiceSummary && (
              <CardContent className="pt-0">
                {loading ? (
                  <CardSkeleton />
                ) : (
                  <Suspense fallback={<CardSkeleton />}>
                    <ServiceSummaryChart rows={serviceSummary} embedded />
                  </Suspense>
                )}
              </CardContent>
            )}
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Sedang Dilayani</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {ALL_GROUPS.map((group) => (
                <ActiveCallCard
                  key={group}
                  group={group}
                  ticket={activeCalls[group]}
                  now={now}
                  actionLoading={actionLoading}
                  onComplete={handleComplete}
                  onRecall={handleRecall}
                  onSkip={handleSkip}
                />
              ))}
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle>Antrian Selesai</CardTitle>
              {recentCompleted.length > 0 && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2Icon className="size-4" />
                      <span className="ml-2 text-xs">Clear</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Hapus Riwayat</DialogTitle>
                      <DialogDescription>
                        Apakah kamu yakin ingin menghapus semua riwayat antrian yang sudah selesai?
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button variant="outline">Batal</Button>
                      </DialogClose>
                      <Button
                        variant="destructive"
                        onClick={handleClearHistory}
                        disabled={actionLoading === 'clear-history'}
                      >
                        {actionLoading === 'clear-history' ? 'Menghapus...' : 'Ya, Hapus'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </CardHeader>
            <CardContent>
              {recentCompleted.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <p>Belum ada riwayat selesai</p>
                </div>
              ) : (
                <ScrollArea className="h-[4.5rem] pr-3">
                  <div className="space-y-3">
                    {recentCompleted.map((ticket) => (
                      <div
                        key={ticket.id}
                        className="flex items-center justify-between rounded-lg border px-4 py-3"
                      >
                        <div>
                          <div className="font-semibold text-foreground">
                            {ticket.queueNumber}
                          </div>
                          <div className="text-xs capitalize text-muted-foreground">
                            {getServiceLabel(ticket.serviceType)} • Selesai {formatClock(ticket.completedAt)}
                          </div>
                        </div>
                        <Badge className="bg-green-100 text-green-800">Selesai</Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Aksi Cepat</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => fetchData()}
                disabled={loading}
              >
                {loading && <Spinner data-icon="inline-start" />}
                {loading ? 'Memuat...' : 'Refresh Data'}
              </Button>
              <p className="text-center text-[11px] text-muted-foreground">
                Tekan <kbd className="rounded border bg-muted px-1 font-mono text-[10px]">?</kbd> untuk pintasan keyboard
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showShortcutHelp} onOpenChange={setShowShortcutHelp}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pintasan Keyboard</DialogTitle>
            <DialogDescription>
              Tombol pintasan untuk mempercepat kerja di dashboard petugas.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            {[
              { key: 'C / Spasi', desc: 'Panggil antrian berikutnya (cek konflik grup)' },
              { key: 'S', desc: 'Skip / lewati antrian teratas' },
              { key: 'Enter', desc: 'Selesaikan antrian aktif' },
              { key: 'R', desc: 'Panggil ulang antrian aktif' },
              { key: 'I', desc: 'Aktifkan / Istirahatkan loket' },
              { key: '?', desc: 'Tampilkan / sembunyikan bantuan ini' },
            ].map(({ key, desc }) => (
              <div key={key} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                <span className="text-muted-foreground">{desc}</span>
                <kbd className="rounded border bg-background px-2 py-0.5 font-mono text-xs font-medium">
                  {key}
                </kbd>
              </div>
            ))}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Tutup</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StatCards({ stats }: { stats: QueueStats }) {
  const items: { label: string; value: number; color: string }[] = [
    { label: 'Total', value: stats.total, color: 'text-foreground' },
    { label: 'Menunggu', value: stats.waiting, color: 'text-yellow-600' },
    { label: 'Dipanggil', value: stats.called, color: 'text-blue-600' },
    { label: 'Dilayani', value: stats.serving, color: 'text-green-600' },
    { label: 'Selesai', value: stats.completed, color: 'text-green-700' },
  ]

  return (
    <>
      {items.map((item) => (
        <Card key={item.label} size="sm">
          <CardContent className="text-center">
            <div className={`text-2xl font-bold ${item.color}`}>{item.value}</div>
            <div className="text-xs text-muted-foreground">{item.label}</div>
          </CardContent>
        </Card>
      ))}
    </>
  )
}
