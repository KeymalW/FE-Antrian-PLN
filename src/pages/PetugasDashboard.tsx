import { useEffect, useState, useCallback, lazy, Suspense } from 'react'
import { useAuthStore } from '../store/authStore'
import { useQueueStore } from '../store/queueStore'
import { useWebSocket } from '../hooks/useWebSocket'
import { useQueueSound } from '../hooks/useQueueSound'
import {
  getQueueList,
  getQueueStats,
  callQueue,
  skipQueue,
  completeQueue,
  getLastCalled,
  clearQueueHistory,
} from '../services/queue'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Skeleton } from '../components/ui/skeleton'
import { Spinner } from '../components/ui/spinner'
import { ScrollArea } from '../components/ui/scroll-area'
import type { QueueTicket, QueueStats, QueueStatus } from '../types/queue'
import { ChevronDownIcon, ChevronUpIcon, BarChart3Icon, Trash2Icon } from 'lucide-react'
import {
  getServiceLabel,
  getServiceSortScore,
} from '../lib/serviceTypes'
import { buildWeeklyCounterChartData, type WeeklyCounterChartRow } from '../lib/weeklyCounterChart'

const ServiceSummaryChart = lazy(() =>
  import('../components/dashboard/ServiceSummaryChart').then((module) => ({
    default: module.ServiceSummaryChart,
  })),
)

const statusLabel: Record<QueueStatus, string> = {
  waiting: 'Menunggu',
  called: 'Dipanggil',
  serving: 'Dilayani',
  completed: 'Selesai',
  skipped: 'Dilewati',
}

const statusColor: Record<QueueStatus, string> = {
  waiting: 'bg-yellow-100 text-yellow-800',
  called: 'bg-blue-100 text-blue-800',
  serving: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  skipped: 'bg-gray-100 text-gray-600',
}

function QueueStatusBadge({ status }: { status: QueueStatus }) {
  return <Badge className={statusColor[status]}>{statusLabel[status]}</Badge>
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

export default function PetugasDashboard() {
  const { user } = useAuthStore()
  const { queueList, setQueueList, stats, setStats, setLastCalled, lastCalled, counterStatus, setCounterStatus } = useQueueStore()
  const { playCallSound, playBeep, announceQueueCall } = useQueueSound()
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [recentCompleted, setRecentCompleted] = useState<QueueTicket[]>([])
  const [serviceSummary, setServiceSummary] = useState<WeeklyCounterChartRow[]>([])
  const [showServiceSummary, setShowServiceSummary] = useState(false)
  const [now, setNow] = useState(new Date())

  const counterNumber = user?.counterNumber ?? 1
  const isCounterPaused = counterStatus[counterNumber] ?? false

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const fetchData = useCallback(async () => {
    try {
      const [list, statsData, last, completed, allTickets] = await Promise.all([
        getQueueList({ status: 'waiting' }),
        getQueueStats(),
        getLastCalled(counterNumber),
        getQueueList({ status: 'completed', perPage: 10 }),
        getQueueList({ perPage: 1000 }),
      ])
      setQueueList(sortWaitingTickets(list))
      setStats(statsData)
      setLastCalled(last)
      setRecentCompleted(sortRecentCompleted(completed))
      setServiceSummary(buildWeeklyCounterChartData(allTickets))
    } catch {
      console.error('Failed to fetch queue data')
    } finally {
      setLoading(false)
    }
  }, [counterNumber, setQueueList, setStats, setLastCalled])

  useWebSocket({
    onQueueUpdate: () => {
      fetchData()
    },
    onQueueCall: (msg) => {
      const payload = msg.payload as QueueTicket
      setLastCalled(payload)
      playCallSound()
      announceQueueCall(payload)
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

    setActionLoading(queueId)
    try {
      const result = await callQueue({ queueId, counterNumber })
      setLastCalled(result)
      playCallSound()
      announceQueueCall(result)
      await fetchData()
    } catch {
      playBeep()
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
      // silent
    } finally {
      setActionLoading(null)
    }
  }

  const handleComplete = async (queueId: string) => {
    setActionLoading(queueId)
    try {
      await completeQueue(queueId)
      setLastCalled(null)
      await fetchData()
    } catch {
      // silent
    } finally {
      setActionLoading(null)
    }
  }

  const handleRecall = () => {
    if (!lastCalled) return
    playCallSound()
    announceQueueCall(lastCalled)
  }

  const handleClearHistory = async () => {
    setActionLoading('clear-history')
    try {
      await clearQueueHistory()
      await fetchData()
    } catch {
      // silent
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
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
                  {queueList.map((q) => (
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
                        <QueueStatusBadge status={q.status} />
                      </div>
                      <div className="flex flex-wrap gap-2 md:justify-end">
                        <Button
                          size="sm"
                          onClick={() => handleCall(q.id)}
                          disabled={actionLoading === q.id || isCounterPaused}
                        >
                          {actionLoading === q.id && <Spinner data-icon="inline-start" />}
                          Panggil
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
                          onClick={() => handleSkip(q.id)}
                        >
                          Skip
                        </Button>
                      </div>
                    </div>
                  ))}
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
              <CardTitle>Sedang Dilayani di Loket #{counterNumber}</CardTitle>
            </CardHeader>
            <CardContent>
              {lastCalled ? (
                <div className="text-center">
                  <div className="text-4xl font-bold text-green-600">
                    {lastCalled.queueNumber}
                  </div>
                  <div className="mt-1 text-sm capitalize text-muted-foreground">
                    {getServiceLabel(lastCalled.serviceType)}
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Dipanggil di Loket #{lastCalled.counterNumber ?? counterNumber}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Waktu panggil {formatClock(lastCalled.calledAt)} • Durasi {formatElapsed(lastCalled.calledAt, now)}
                  </div>
                  <div className="mt-4 flex justify-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleComplete(lastCalled.id)}
                      disabled={actionLoading === lastCalled.id}
                    >
                      {actionLoading === lastCalled.id && <Spinner data-icon="inline-start" />}
                      Selesai
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={handleRecall}
                    >
                      Panggil Ulang
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
                      onClick={() => handleSkip(lastCalled.id)}
                    >
                      Skip
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  <p>Tidak ada</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle>Antrian Selesai</CardTitle>
              {recentCompleted.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={handleClearHistory}
                  disabled={actionLoading === 'clear-history'}
                >
                  {actionLoading === 'clear-history' ? (
                    <Spinner className="size-4" />
                  ) : (
                    <Trash2Icon className="size-4" />
                  )}
                  <span className="ml-2 text-xs">Clear</span>
                </Button>
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
            <CardContent>
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => fetchData()}
                disabled={loading}
              >
                {loading && <Spinner data-icon="inline-start" />}
                {loading ? 'Memuat...' : 'Refresh Data'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
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
