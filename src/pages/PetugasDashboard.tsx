import { useEffect, useState, useCallback, useRef, useMemo, lazy, Suspense } from 'react'
import { toast } from 'sonner'
import { useAuthStore } from '../store/authStore'
import { useQueueStore } from '../store/queueStore'
import { useServicesStore } from '../store/servicesStore'
import { useWebSocket } from '../hooks/useWebSocket'
import { useQueueSound } from '../hooks/useQueueSound'
import { cn } from '../lib/utils'
import {
  getQueueList,
  getQueueStats,
  getWeeklyQueueList,
  callQueue,
  skipQueue,
  completeQueue,
  recallQueue,
  clearQueueHistory,
} from '../services/queue'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Skeleton } from '../components/ui/skeleton'
import { Spinner } from '../components/ui/spinner'
import { PageHeader } from '../components/admin/PageHeader'
import { EmptyState } from '../components/admin/EmptyState'
import { StatCard } from '../components/admin/StatCard'
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
import type { QueueTicket, QueueStats } from '../types/queue'
import {
  ActivityIcon,
  BellRingIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClockIcon,
  HistoryIcon,
  InboxIcon,
  KeyboardIcon,
  RefreshCwIcon,
  Trash2Icon,
  UserCheckIcon,
} from 'lucide-react'
import {
  getServiceLabel,
  getServiceSortScore,
} from '../lib/serviceTypes'
import { buildWeeklyCounterChartData, type WeeklyServiceChartRow } from '../lib/weeklyCounterChart'
import { formatDateId, formatDateTimeId, formatTimeId, getWeekRangeLabel } from '../lib/datetime'

const ServiceSummaryChart = lazy(() =>
  import('../components/dashboard/ServiceSummaryChart').then((module) => ({
    default: module.ServiceSummaryChart,
  })),
)

function ChartSkeleton() {
  return <Skeleton className="h-[26rem] w-full rounded-xl" />
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
  ticket,
  now,
  actionLoading,
  onComplete,
  onRecall,
  onSkip,
}: {
  ticket: QueueTicket
  now: Date
  actionLoading: string | null
  onComplete: (id: string) => void
  onRecall: (ticket: QueueTicket) => void
  onSkip: (id: string) => void
}) {
  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-5 text-center ring-1 ring-blue-100">
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Nomor Aktif
      </div>
      <div className="mt-2 text-5xl font-semibold tracking-tight text-emerald-600 tabular-nums">
        {ticket.queueNumber}
      </div>
      <div className="mt-1 text-sm capitalize text-muted-foreground">
        {getServiceLabel(ticket.serviceType)}
      </div>
      {ticket.counterNumber != null && (
        <div className="mt-1 text-xs text-muted-foreground">Loket #{ticket.counterNumber}</div>
      )}
      <div className="mt-1 text-xs tabular-nums text-muted-foreground">
        {formatDateTimeId(ticket.calledAt)}
      </div>
      <div className="mt-0.5 text-xs font-medium tabular-nums text-foreground">
        Berjalan {formatElapsed(ticket.calledAt, now)}
      </div>
      <div className="mt-4 flex justify-center gap-2">
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
          variant="outline"
          onClick={() => onRecall(ticket)}
          disabled={actionLoading === ticket.id}
        >
          {actionLoading === ticket.id && <Spinner data-icon="inline-start" />}
          Panggil Ulang
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
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
  const { queueList, setQueueList, stats, setStats, counterStatus, setCounterStatus } = useQueueStore()
  const { services, fetchServices } = useServicesStore()
  const { playBeep, unlockAudio } = useQueueSound()
  const [selectedCodeRaw, setSelectedCode] = useState<string | null>(null)
  // Turunan: fallback ke layanan pertama bila belum memilih / layanan dihapus.
  const selectedCode = useMemo(
    () =>
      selectedCodeRaw && services.some((s) => s.code === selectedCodeRaw)
        ? selectedCodeRaw
        : services[0]?.code ?? null,
    [selectedCodeRaw, services],
  )
  const [activeByService, setActiveByService] = useState<Record<string, QueueTicket | null>>({})
  const activeRef = useRef<Record<string, QueueTicket | null>>(activeByService)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [recentCompleted, setRecentCompleted] = useState<QueueTicket[]>([])
  const [serviceSummary, setServiceSummary] = useState<WeeklyServiceChartRow[]>([])
  const [showServiceSummary, setShowServiceSummary] = useState(false)
  const [now, setNow] = useState(new Date())

  const counterNumber = user?.counterNumber ?? 1
  const isCounterPaused = counterStatus[counterNumber] ?? false
  const activeForTab = selectedCode ? activeByService[selectedCode] ?? null : null

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchServices()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [fetchServices])

  const setServiceActive = useCallback((code: string, ticket: QueueTicket | null) => {
    activeRef.current = { ...activeRef.current, [code]: ticket }
    setActiveByService((prev) => ({ ...prev, [code]: ticket }))
  }, [])

  const visibleQueue = useMemo(
    () => queueList.filter((q) => q.serviceType === selectedCode),
    [queueList, selectedCode],
  )

  const selectedName = selectedCode ? getServiceLabel(selectedCode) : null

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

      const allActive = [...calledTickets, ...servingTickets].filter(
        (t) => t.counterNumber === counterNumber,
      )
      // Bangun peta aktif per kode layanan (katalog + kode tak dikenal).
      const catalog = useServicesStore.getState().services
      const nextMap: Record<string, QueueTicket | null> = {}
      for (const s of catalog) nextMap[s.code] = null
      for (const t of allActive) {
        if (!(t.serviceType in nextMap)) nextMap[t.serviceType] = null
        nextMap[t.serviceType] = t
      }
      activeRef.current = nextMap
      setActiveByService(nextMap)

      setRecentCompleted(sortRecentCompleted(completed))
      setServiceSummary(buildWeeklyCounterChartData(allTickets))
    } catch {
      if (import.meta.env.DEV) console.error('Failed to fetch queue data')
      toast.error('Gagal memuat data antrian')
    } finally {
      setLoading(false)
    }
  }, [counterNumber, setQueueList, setStats])

  useWebSocket({
    onQueueUpdate: () => {
      fetchData()
    },
    onQueueCall: (msg) => {
      const payload = msg.payload as QueueTicket
      if (payload.counterNumber === counterNumber) {
        setServiceActive(payload.serviceType, payload)
      }
      fetchData()
    },
    onQueueComplete: () => {
      fetchData()
    },
    onQueueSkip: () => {
      fetchData()
    },
    onServicesUpdate: () => {
      // Tab layanan baru/berubah langsung muncul tanpa refresh.
      void fetchServices()
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

  const handleCall = useCallback(async (queueId: string) => {
    if (isCounterPaused) {
      playBeep()
      return
    }

    const ticket = queueList.find((t) => t.id === queueId)
    if (!ticket) return

    // Guard via ref — kebal closure basi pada rantai auto-panggil.
    const currentActive = activeRef.current[ticket.serviceType] ?? null
    if (currentActive && currentActive.id !== ticket.id) {
      toast.info(
        `Masih ada antrian ${getServiceLabel(ticket.serviceType)} aktif (${currentActive.queueNumber}). Selesaikan atau lewati dulu.`,
      )
      playBeep()
      return
    }

    setActionLoading(queueId)
    try {
      const result = await callQueue({ queueId, counterNumber })
      setServiceActive(ticket.serviceType, result)
      await fetchData()
    } catch (err) {
      playBeep()
      const backendMsg = (
        err as { response?: { data?: { message?: string } } }
      )?.response?.data?.message
      toast.error(backendMsg ?? 'Gagal memanggil antrian')
    } finally {
      setActionLoading(null)
    }
  }, [isCounterPaused, playBeep, queueList, counterNumber, fetchData, setServiceActive])

  const handleSkip = useCallback(async (queueId: string) => {
    setActionLoading(queueId)
    try {
      await skipQueue(queueId)
      await fetchData()
    } catch {
      toast.error('Gagal melewati antrian')
    } finally {
      setActionLoading(null)
    }
  }, [setActionLoading, fetchData])

  const handleComplete = useCallback(async (queueId: string) => {
    setActionLoading(queueId)
    // Catat layanan tiket yang selesai — auto-panggil hanya se-layanan.
    const completedCode =
      useQueueStore.getState().queueList.find((t) => t.id === queueId)?.serviceType ?? null
    try {
      await completeQueue(queueId)
      await fetchData()

      // Auto-panggil tiket berikutnya dalam layanan yang sama (bila loket aktif).
      if (!isCounterPaused && completedCode) {
        const next =
          useQueueStore.getState().queueList.find((t) => t.serviceType === completedCode) ?? null
        if (next) {
          unlockAudio()
          await handleCall(next.id)
        }
      }
    } catch {
      toast.error('Gagal menyelesaikan antrian')
    } finally {
      setActionLoading(null)
    }
  }, [isCounterPaused, fetchData, handleCall, unlockAudio])

  const handleRecall = useCallback(async (ticket: QueueTicket) => {
    setActionLoading(ticket.id)
    try {
      await unlockAudio()
      // Panggil ulang disiarkan lewat server agar suara keluar di TV display.
      await recallQueue(ticket.id)
    } catch {
      playBeep()
      toast.error('Gagal memanggil ulang antrian')
    } finally {
      setActionLoading(null)
    }
  }, [playBeep, unlockAudio])

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

  const findNextCallable = useCallback(() => {
    // Daftar tab sudah terfilter layanan — ambil teratas.
    return visibleQueue[0] ?? null
  }, [visibleQueue])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      switch (e.key) {
        case 'c':
        case 'C':
        case ' ': {
          e.preventDefault()
          if (isCounterPaused || visibleQueue.length === 0) break
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
          if (visibleQueue.length > 0) {
            handleSkip(visibleQueue[0].id)
          }
          break
        case 'Enter':
          if (activeForTab) {
            e.preventDefault()
            unlockAudio()
            handleComplete(activeForTab.id)
          }
          break
        case 'r':
        case 'R':
          if (activeForTab) {
            e.preventDefault()
            unlockAudio()
            handleRecall(activeForTab)
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
  }, [
    isCounterPaused,
    queueList,
    visibleQueue,
    selectedCode,
    activeForTab,
    counterNumber,
    findNextCallable,
    handleCall,
    handleComplete,
    handleRecall,
    handleSkip,
    setCounterStatus,
    unlockAudio,
  ])

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <PageHeader
        title="Dashboard Petugas"
        description={`Loket #${counterNumber} — ${user?.name ?? ''}`}
        actions={
          <>
            <Badge
              className={
                isCounterPaused
                  ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                  : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
              }
            >
              {isCounterPaused ? 'Loket Istirahat' : 'Loket Aktif'}
            </Badge>
            <Button variant="outline" onClick={() => setCounterStatus(counterNumber, !isCounterPaused)}>
              {isCounterPaused ? 'Aktifkan Loket' : 'Istirahat Loket'}
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setShowShortcutHelp(true)}
              title="Pintasan Keyboard (?)"
            >
              <KeyboardIcon />
            </Button>
          </>
        }
      />

      {/* Tab jalur per layanan */}
      <div role="tablist" aria-label="Pilih layanan" className="flex flex-wrap items-center gap-2">
        {services
          .filter((s) => s.isActive)
          .map((s) => {
            const count = queueList.filter((q) => q.serviceType === s.code).length
            const isActiveTab = s.code === selectedCode
            return (
              <button
                key={s.id}
                role="tab"
                aria-selected={isActiveTab}
                onClick={() => setSelectedCode(s.code)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors',
                  isActiveTab
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground',
                )}
              >
                {getServiceLabel(s.code)}
                {!isActiveTab && activeByService[s.code] && (
                  <span
                    className="size-1.5 rounded-full bg-emerald-500"
                    aria-hidden="true"
                    title="Ada tiket aktif di layanan ini"
                  />
                )}
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.5 text-[11px] tabular-nums',
                    isActiveTab ? 'bg-primary-foreground/20' : 'bg-card',
                  )}
                >
                  {count}
                </span>
              </button>
            )
          })}
      </div>

      <section aria-label="Statistik antrian">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {stats ? (
            <>
              <StatCard label="Total" value={stats.total} tone="neutral" icon={ActivityIcon} />
              <StatCard label="Menunggu" value={stats.waiting} tone="amber" icon={ClockIcon} />
              <StatCard label="Dipanggil" value={stats.called} tone="blue" icon={BellRingIcon} />
              <StatCard label="Dilayani" value={stats.serving} tone="emerald" icon={UserCheckIcon} />
              <StatCard label="Selesai" value={stats.completed} tone="green" icon={CheckCircle2Icon} />
            </>
          ) : (
            <>
              <StatCard label="Total" value={0} tone="neutral" icon={ActivityIcon} loading />
              <StatCard label="Menunggu" value={0} tone="amber" icon={ClockIcon} loading />
              <StatCard label="Dipanggil" value={0} tone="blue" icon={BellRingIcon} loading />
              <StatCard label="Dilayani" value={0} tone="emerald" icon={UserCheckIcon} loading />
              <StatCard label="Selesai" value={0} tone="green" icon={CheckCircle2Icon} loading />
            </>
          )}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader className="[.border-b]:pb-4">
              <div>
                <CardTitle>
                  Antrian Menunggu
                  {selectedCode ? ` — ${getServiceLabel(selectedCode)}` : ''}
                </CardTitle>
                <CardDescription>{visibleQueue.length} tiket dalam antrean</CardDescription>
              </div>
              <Badge variant="secondary" className="tabular-nums">
                {visibleQueue.length}
              </Badge>
            </CardHeader>
            <CardContent>
              {isCounterPaused && (
                <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  Loket sedang istirahat. Tombol Panggil dinonaktifkan sementara.
                </div>
              )}

              {activeForTab && !isCounterPaused && (
                <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                  Antrian aktif sedang berjalan ({activeForTab.queueNumber}). Selesaikan atau lewati sebelum memanggil berikutnya.
                </div>
              )}

              {loading ? (
                <div className="flex flex-col gap-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-lg" />
                  ))}
                </div>
              ) : visibleQueue.length === 0 ? (
                <EmptyState
                  icon={InboxIcon}
                  title="Tidak ada antrian untuk layanan ini"
                  description="Pilih tab layanan lain atau tunggu tiket baru."
                  compact
                />
              ) : (
                <div className="max-h-72 overflow-auto">
                  <div className="min-w-[520px]">
                    {queueList.map((q) => (
                      <div
                        key={q.id}
                        className="flex items-center justify-between gap-3 border-b border-border/70 py-3 transition-colors last:border-b-0 hover:bg-muted/40"
                      >
                        <div className="grid min-w-0 flex-1 grid-cols-[4.5rem_minmax(0,14rem)] items-center gap-3">
                          <span className="text-lg font-semibold tabular-nums text-foreground">
                            {q.queueNumber}
                          </span>
                          <div className="flex min-w-0 flex-col">
                            <span className="truncate text-sm capitalize text-muted-foreground">
                              {getServiceLabel(q.serviceType)}
                            </span>
                            <span className="truncate text-[11px] tabular-nums text-muted-foreground">
                              Dicetak {formatDateTimeId(q.createdAt)}
                            </span>
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleCall(q.id)}
                            disabled={
                              actionLoading === q.id ||
                              isCounterPaused ||
                              !!activeForTab
                            }
                          >
                            {actionLoading === q.id && <Spinner data-icon="inline-start" />}
                            Panggil
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSkip(q.id)}
                            disabled={actionLoading === q.id}
                          >
                            Skip
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-start justify-between gap-4 space-y-0 [.border-b]:pb-4">
              <div>
                <CardTitle>Perbandingan Loket Mingguan</CardTitle>
                <CardDescription>
                  Minggu ini: {getWeekRangeLabel()} (Senin–Jumat)
                </CardDescription>
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
                  <ChartSkeleton />
                ) : (
                  <Suspense fallback={<ChartSkeleton />}>
                    <ServiceSummaryChart rows={serviceSummary} embedded />
                  </Suspense>
                )}
              </CardContent>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="[.border-b]:pb-4">
              <div>
                <CardTitle>Sedang Dilayani</CardTitle>
                <CardDescription>
                  {selectedName ? `Layanan ${selectedName}` : 'Loket Anda'}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {activeForTab ? (
                <ActiveCallCard
                  ticket={activeForTab}
                  now={now}
                  actionLoading={actionLoading}
                  onComplete={handleComplete}
                  onRecall={handleRecall}
                  onSkip={handleSkip}
                />
              ) : (
                <EmptyState
                  icon={UserCheckIcon}
                  title="Belum ada tiket aktif"
                  description={
                    selectedName
                      ? `Tekan Panggil untuk memulai ${selectedName}.`
                      : 'Pilih tab layanan lalu tekan Panggil.'
                  }
                  compact
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between gap-4 space-y-0 [.border-b]:pb-4">
              <div>
                <CardTitle>Antrian Selesai</CardTitle>
                <CardDescription>10 tiket terakhir.</CardDescription>
              </div>
              {recentCompleted.length > 0 && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2Icon />
                      Clear
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
                <EmptyState
                  icon={HistoryIcon}
                  title="Belum ada riwayat selesai"
                  compact
                />
              ) : (
                <div className="max-h-[11rem] space-y-2 overflow-y-auto pr-1">
                  {recentCompleted.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border px-3.5 py-2.5 transition-colors hover:bg-muted/40"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-semibold tabular-nums text-foreground">
                          {ticket.queueNumber}
                        </div>
                        <div className="truncate text-[11px] capitalize text-muted-foreground">
                          {getServiceLabel(ticket.serviceType)} • Selesai{' '}
                          <span className="tabular-nums">{formatDateId(ticket.completedAt)}</span>{' '}
                          <span className="tabular-nums">{formatTimeId(ticket.completedAt)}</span>
                        </div>
                      </div>
                      <Badge className="shrink-0 bg-green-50 text-green-700 ring-1 ring-green-200">
                        Selesai
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="[.border-b]:pb-4">
              <CardTitle>Aksi Cepat</CardTitle>
              <CardDescription>Segarkan data tanpa menunggu notifikasi.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => fetchData()}
                disabled={loading}
              >
                <RefreshCwIcon className={loading ? 'animate-spin' : ''} data-icon="inline-start" />
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
