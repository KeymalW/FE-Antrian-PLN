import { useEffect, useState, useCallback, lazy, Suspense } from 'react'
import { useQueueStore } from '../store/queueStore'
import { useWebSocket } from '../hooks/useWebSocket'
import {
  getQueueList,
  getQueueStats,
  getLastCalled,
  clearQueueHistory,
} from '../services/queue'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Skeleton } from '../components/ui/skeleton'
import { ScrollArea } from '../components/ui/scroll-area'
import type { QueueTicket, QueueStats, QueueStatus } from '../types/queue'
import {
  ChevronDownIcon,
  ChevronUpIcon,
  BarChart3Icon,
  Trash2Icon,
  RotateCcwIcon,
  RefreshCwIcon,
} from 'lucide-react'
import { getServiceLabel } from '../lib/serviceTypes'
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

const COUNTERS = [1, 2, 3]

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

function formatElapsed(start: string | null) {
  if (!start) return '--:--'
  const diff = Math.max(0, Date.now() - new Date(start).getTime())
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

export default function AdminDashboard() {
  const { stats, setStats, counterStatus } = useQueueStore()
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [waitingQueue, setWaitingQueue] = useState<QueueTicket[]>([])
  const [recentCompleted, setRecentCompleted] = useState<QueueTicket[]>([])
  const [counters, setCounters] = useState<(QueueTicket | null)[]>([null, null, null])
  const [serviceSummary, setServiceSummary] = useState<WeeklyCounterChartRow[]>([])
  const [showServiceSummary, setShowServiceSummary] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [list, statsData, completed, allTickets, c1, c2, c3] = await Promise.all([
        getQueueList({ status: 'waiting' }),
        getQueueStats(),
        getQueueList({ status: 'completed', perPage: 20 }),
        getQueueList({ perPage: 1000 }),
        getLastCalled(1),
        getLastCalled(2),
        getLastCalled(3),
      ])
      setWaitingQueue(list)
      setStats(statsData)
      setRecentCompleted(sortRecentCompleted(completed))
      setCounters([c1, c2, c3])
      setServiceSummary(buildWeeklyCounterChartData(allTickets))
    } catch {
      console.error('Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }, [setStats])

  useWebSocket({
    onQueueUpdate: () => fetchData(),
    onQueueCall: () => fetchData(),
    onQueueComplete: () => fetchData(),
    onQueueSkip: () => fetchData(),
    onStatsUpdate: (msg) => setStats(msg.payload as QueueStats),
  })

  useEffect(() => {
    const timer = window.setTimeout(() => void fetchData(), 0)
    return () => window.clearTimeout(timer)
  }, [fetchData])

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
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard Admin</h1>
          <p className="text-sm text-muted-foreground">
            Pantau dan kelola seluruh antrian
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchData()}
            disabled={loading}
          >
            <RefreshCwIcon className={`mr-2 size-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {stats
          ? (
            <>
              <StatCard label="Total" value={stats.total} color="text-foreground" />
              <StatCard label="Menunggu" value={stats.waiting} color="text-yellow-600" />
              <StatCard label="Dipanggil" value={stats.called} color="text-blue-600" />
              <StatCard label="Dilayani" value={stats.serving} color="text-green-600" />
              <StatCard label="Selesai" value={stats.completed} color="text-green-700" />
              <StatCard label="Dilewati" value={stats.skipped} color="text-gray-500" />
            </>
          )
          : Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {COUNTERS.map((num) => {
              const active = counters[num - 1]
              const isPaused = counterStatus[num] ?? false
              return (
                <Card key={num}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between text-sm">
                      Loket #{num}
                      {isPaused && (
                        <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/50 dark:text-red-400">
                          Istirahat
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    {isPaused ? (
                      <div className="py-4 text-sm text-muted-foreground">Istirahat</div>
                    ) : loading ? (
                      <Skeleton className="mx-auto h-8 w-20" />
                    ) : active ? (
                      <>
                        <div className="text-3xl font-bold text-green-600">
                          {active.queueNumber}
                        </div>
                        <div className="mt-1 text-xs capitalize text-muted-foreground">
                          {getServiceLabel(active.serviceType)}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {active.status === 'serving' ? 'Dilayani' : 'Dipanggil'} • {formatElapsed(active.calledAt)}
                        </div>
                      </>
                    ) : (
                      <div className="py-4 text-sm text-muted-foreground">Tidak ada</div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Antrian Menunggu ({waitingQueue.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex flex-col gap-3">
                  {Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} />)}
                </div>
              ) : waitingQueue.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <p className="text-lg font-medium">Tidak ada antrian</p>
                </div>
              ) : (
                <ScrollArea className="h-[16rem] pr-3">
                  {waitingQueue.map((q) => (
                    <div
                      key={q.id}
                      className="flex items-center justify-between border-b py-3 last:border-b-0"
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-lg font-bold tabular-nums text-primary">
                          {q.queueNumber}
                        </span>
                        <div>
                          <span className="text-sm capitalize text-muted-foreground">
                            {getServiceLabel(q.serviceType)}
                          </span>
                          <span className="ml-2 text-xs text-muted-foreground">
                            {formatClock(q.createdAt)}
                          </span>
                        </div>
                      </div>
                      <QueueStatusBadge status={q.status} />
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
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle>Riwayat Selesai</CardTitle>
              {recentCompleted.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={handleClearHistory}
                  disabled={actionLoading === 'clear-history'}
                >
                  {actionLoading === 'clear-history' ? (
                    <Skeleton className="size-4 rounded-full" />
                  ) : (
                    <Trash2Icon className="size-4" />
                  )}
                  <span className="ml-2 text-xs">Clear</span>
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {loading ? (
                <CardSkeleton />
              ) : recentCompleted.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <p>Belum ada riwayat</p>
                </div>
              ) : (
                <ScrollArea className="h-[22rem] pr-3">
                  <div className="space-y-2">
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
                            {getServiceLabel(ticket.serviceType)}
                            {ticket.counterNumber && ` • Loket ${ticket.counterNumber}`}
                          </div>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          {formatClock(ticket.completedAt)}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Pengaturan</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Button
                variant="secondary"
                className="w-full"
                onClick={handleClearHistory}
                disabled={actionLoading === 'clear-history'}
              >
                <RotateCcwIcon className="mr-2 size-4" />
                Reset Semua Antrian
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Card size="sm">
      <CardContent className="text-center">
        <div className={`text-2xl font-bold ${color}`}>{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  )
}
