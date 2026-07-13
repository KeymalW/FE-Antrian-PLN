import { useEffect, useState, useCallback, useRef, lazy, Suspense } from 'react'
import { toast } from 'sonner'
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
import {
  ChevronDownIcon,
  ChevronUpIcon,
  BarChart3Icon,
  Trash2Icon,
  RotateCcwIcon,
  RefreshCwIcon,
  MonitorPlayIcon,
  UploadIcon,
  Volume2Icon,
} from 'lucide-react'
import { getServiceLabel } from '../lib/serviceTypes'
import type { VideoData } from '../services/settings'
import { getMonitorVideos, uploadMonitorVideo, deleteMonitorVideo, getServerVideoVolume, setServerVideoVolume } from '../services/settings'
import { buildWeeklyCounterChartData, WEEKDAY_COLORS, type WeeklyServiceChartRow } from '../lib/weeklyCounterChart'

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

const COUNTER_SERVICE_MAP: Record<number, ServiceType> = {
  1: 'pengaduan',
  2: 'pb_pd_migrasi',
  3: 'p2tl',
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

export default function AdminDashboard() {
  const { stats, setStats, counterStatus } = useQueueStore()
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [waitingQueue, setWaitingQueue] = useState<QueueTicket[]>([])
  const [recentCompleted, setRecentCompleted] = useState<QueueTicket[]>([])
  const [counters, setCounters] = useState<(QueueTicket | null)[]>([null, null, null])
  const [serviceSummary, setServiceSummary] = useState<WeeklyServiceChartRow[]>([])
  const [showServiceSummary, setShowServiceSummary] = useState(false)
  const [now, setNow] = useState(new Date())
  const fetchIdRef = useRef(0)

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const fetchData = useCallback(async () => {
    const id = ++fetchIdRef.current
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
      if (id !== fetchIdRef.current) return
      setWaitingQueue(list)
      setStats(statsData)
      setRecentCompleted(sortRecentCompleted(completed))
      setCounters([c1, c2, c3])
      setServiceSummary(buildWeeklyCounterChartData(allTickets))
    } catch {
      if (import.meta.env.DEV) console.error('Failed to fetch data')
      toast.error('Gagal memuat data dashboard')
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
      toast.error('Gagal menghapus riwayat antrian')
    } finally {
      setActionLoading(null)
    }
  }

  const [videos, setVideos] = useState<VideoData[]>([])
  const [videoLoading, setVideoLoading] = useState(true)
  const [videoUploading, setVideoUploading] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [videoVolume, setVideoVolume] = useState(0.2)
  const [volumeSaving, setVolumeSaving] = useState(false)
  const [showVideoSection, setShowVideoSection] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const fetchVideos = useCallback(async () => {
    setVideoLoading(true)
    try {
      const data = await getMonitorVideos()
      setVideos(data)
    } catch {
      setVideos([])
    } finally {
      setVideoLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchVideos()
    getServerVideoVolume().then(setVideoVolume)
  }, [fetchVideos])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setVideoUploading(true)
    try {
      await uploadMonitorVideo(file)
      await fetchVideos()
      toast.success('Video berhasil diupload')
    } catch {
      toast.error('Gagal mengupload video')
    } finally {
      setVideoUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleDeleteVideo = async (filename: string) => {
    setDeleting(filename)
    try {
      await deleteMonitorVideo(filename)
      await fetchVideos()
      toast.success('Video berhasil dihapus')
    } catch {
      toast.error('Gagal menghapus video')
    } finally {
      setDeleting(null)
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
            {Object.entries(COUNTER_SERVICE_MAP).map(([numStr, serviceType]) => {
              const num = Number(numStr)
              const active = counters[num - 1]
              const isPaused = counterStatus[num] ?? false
              return (
                <Card key={num} className="border-t-4" style={{ borderTopColor: WEEKDAY_COLORS[serviceType] }}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between text-sm">
                      {getServiceLabel(serviceType)}
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
                          {active.status === 'serving' ? 'Dilayani' : 'Dipanggil'} • {formatElapsed(active.calledAt, now)}
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

          <Card className="mt-6 border-t-4" style={{ borderTopColor: '#22d3ee' }}>
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

          <Card className="mt-6 rounded-2xl border-t-4 shadow-sm" style={{ borderTopColor: '#22d3ee' }}>
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3Icon className="size-5 text-pln-cyan" />
                  Perbandingan Layanan Mingguan
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Distribusi tiket per layanan untuk hari kerja Senin sampai Jumat.
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
          <Card className="border-t-4" style={{ borderTopColor: '#8B5CF6' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle>Riwayat Selesai</CardTitle>
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
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="secondary" className="w-full">
                    <RotateCcwIcon className="mr-2 size-4" />
                    Reset Semua Antrian
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Reset Semua Antrian</DialogTitle>
                    <DialogDescription>
                      Apakah kamu yakin? Semua antrian yang sedang berjalan akan dihapus.
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
                      {actionLoading === 'clear-history' ? 'Mereset...' : 'Ya, Reset'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <div className="mt-2 border-t pt-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <MonitorPlayIcon className="size-4 text-pln-cyan" />
                    Video Monitor ({videos.length})
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowVideoSection((prev) => !prev)}
                  >
                    {showVideoSection ? <ChevronUpIcon /> : <ChevronDownIcon />}
                    {showVideoSection ? 'Minimize' : 'Buka'}
                  </Button>
                </div>

                {showVideoSection && (
                  <>
                    <div
                      onClick={() => inputRef.current?.click()}
                      className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 px-4 py-5 text-center text-sm text-muted-foreground transition-colors hover:border-pln-cyan/50 hover:text-pln-cyan"
                    >
                      <UploadIcon className="size-7" />
                      <span>Klik untuk upload video baru</span>
                      <span className="text-[11px]">MP4, MOV, AVI, WMV, WEBM — maks 200MB</span>
                    </div>

                    <input
                      ref={inputRef}
                      type="file"
                      accept="video/mp4,video/quicktime,video/x-msvideo,video/x-ms-wmv,video/webm"
                      className="hidden"
                      onChange={handleFileSelect}
                    />

                    {videoUploading && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-pln-cyan">
                        <RefreshCwIcon className="size-4 animate-spin" />
                        Mengupload...
                      </div>
                    )}

                    {videoLoading ? (
                      <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                        <RefreshCwIcon className="size-4 animate-spin" />
                        Memuat daftar video...
                      </div>
                    ) : videos.length === 0 ? (
                      <p className="mt-3 text-center text-xs text-muted-foreground">Belum ada video</p>
                    ) : (
                      <div className="mt-3 max-h-[20rem] space-y-2 overflow-y-auto">
                        {videos.map((v) => (
                          <div
                            key={v.filename}
                            className="overflow-hidden rounded-lg border bg-muted/30"
                          >
                            <video
                              src={v.url}
                              className="h-28 w-full bg-black object-cover"
                              controls
                            >
                              Browser tidak mendukung video.
                            </video>
                            <div className="flex items-center justify-between px-3 py-2">
                              <span className="truncate text-xs text-muted-foreground">{v.filename}</span>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteVideo(v.filename)}
                                disabled={deleting === v.filename}
                              >
                                {deleting === v.filename ? (
                                  <RefreshCwIcon className="size-4 animate-spin" />
                                ) : (
                                  <Trash2Icon className="size-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mt-4 border-t pt-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                          <Volume2Icon className="size-4 text-pln-cyan" />
                          Volume Video
                        </div>
                        <span className="text-sm tabular-nums text-muted-foreground">
                          {Math.round(videoVolume * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={videoVolume}
                        onChange={async (e) => {
                          const v = Number(e.target.value)
                          setVideoVolume(v)
                          setVolumeSaving(true)
                          try {
                            await setServerVideoVolume(v)
                          } catch {
                            toast.error('Gagal menyimpan volume')
                          } finally {
                            setVolumeSaving(false)
                          }
                        }}
                        className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-muted-foreground/20 accent-pln-cyan"
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        {videoVolume === 0
                          ? 'Video akan senyap (mute)'
                          : `Video akan diputar dengan volume ${Math.round(videoVolume * 100)}% — suara antrian tidak terganggu`}
                        {volumeSaving && ' • Menyimpan...'}
                      </p>
                    </div>
                  </>
                )}
              </div>
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
