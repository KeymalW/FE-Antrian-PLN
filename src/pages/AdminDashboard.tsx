import { useEffect, useState, useCallback } from 'react'
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
} from '../services/queue'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Skeleton } from '../components/ui/skeleton'
import { Spinner } from '../components/ui/spinner'
import type { QueueTicket, QueueStats } from '../types/queue'
import type { QueueStatus } from '../types/queue'

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
  return (
    <Badge className={statusColor[status]}>
      {statusLabel[status]}
    </Badge>
  )
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

export default function AdminDashboard() {
  const { user } = useAuthStore()
  const { queueList, setQueueList, stats, setStats, setLastCalled, lastCalled } = useQueueStore()
  const { playCallSound, playBeep } = useQueueSound()
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const counterNumber = user?.counterNumber ?? 1

  const fetchData = useCallback(async () => {
    try {
      const [list, statsData, last] = await Promise.all([
        getQueueList({ status: 'waiting' }),
        getQueueStats(),
        getLastCalled(counterNumber),
      ])
      setQueueList(list)
      setStats(statsData)
      setLastCalled(last)
    } catch {
      console.error('Failed to fetch queue data')
    } finally {
      setLoading(false)
    }
  }, [counterNumber, setQueueList, setStats, setLastCalled])

  useWebSocket({
    onQueueUpdate: () => { fetchData() },
    onQueueCall: (msg) => {
      const payload = msg.payload as QueueTicket
      setLastCalled(payload)
      playCallSound()
      fetchData()
    },
    onQueueComplete: () => { fetchData() },
    onQueueSkip: () => { fetchData() },
    onStatsUpdate: (msg) => {
      setStats(msg.payload as QueueStats)
    },
  })

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleCall = async (queueId: string) => {
    setActionLoading(queueId)
    try {
      const result = await callQueue({ queueId, counterNumber })
      setLastCalled(result)
      playCallSound()
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

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Dashboard Petugas</h1>
        <p className="text-sm text-muted-foreground">
          Counter #{counterNumber} — {user?.name}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {stats ? <StatCards stats={stats} /> : Array.from({ length: 5 }).map((_, i) => (
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
                <div>
                  {queueList.map((q) => (
                    <div
                      key={q.id}
                      className="flex items-center justify-between border-b py-3 last:border-b-0"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-primary">
                          {q.queueNumber}
                        </span>
                        <span className="text-sm capitalize text-muted-foreground">
                          {q.serviceType}
                        </span>
                        <QueueStatusBadge status={q.status} />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleCall(q.id)}
                          disabled={actionLoading === q.id}
                        >
                          {actionLoading === q.id && <Spinner data-icon="inline-start" />}
                          Panggil
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleSkip(q.id)}
                        >
                          Skip
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Sedang Dilayani</CardTitle>
            </CardHeader>
            <CardContent>
              {lastCalled ? (
                <div className="text-center">
                  <div className="text-4xl font-bold text-green-600">
                    {lastCalled.queueNumber}
                  </div>
                  <div className="mt-1 text-sm capitalize text-muted-foreground">
                    {lastCalled.serviceType}
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
                      variant="ghost"
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
