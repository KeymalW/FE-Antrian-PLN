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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Skeleton } from '../components/ui/skeleton'
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
import type { QueueTicket, QueueStats, QueueStatus, ServiceType } from '../types/queue'
import {
  ActivityIcon,
  BellRingIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClockIcon,
  HistoryIcon,
  InboxIcon,
  RefreshCwIcon,
  RotateCcwIcon,
  SkipForwardIcon,
  Trash2Icon,
  UploadIcon,
  UserCheckIcon,
  VideoIcon,
  Volume2Icon,
} from 'lucide-react'
import { getServiceLabel, SERVICE_STATUS_LABELS, STATUS_BADGE_COLOR } from '../lib/serviceTypes'
import type { VideoData } from '../services/settings'
import { getMonitorVideos, uploadMonitorVideo, deleteMonitorVideo, getServerVideoVolume, setServerVideoVolume } from '../services/settings'
import { buildWeeklyCounterChartData, WEEKDAY_COLORS, type WeeklyServiceChartRow } from '../lib/weeklyCounterChart'
import { formatDateId, formatDateTimeId, formatTimeId, getWeekRangeLabel } from '../lib/datetime'

const ServiceSummaryChart = lazy(() =>
  import('../components/dashboard/ServiceSummaryChart').then((module) => ({
    default: module.ServiceSummaryChart,
  })),
)

const COUNTER_SERVICE_MAP: Record<number, ServiceType> = {
  1: 'pengaduan',
  2: 'pb_pd_migrasi',
  3: 'p2tl',
}

function QueueStatusBadge({ status }: { status: QueueStatus }) {
  return <Badge className={STATUS_BADGE_COLOR[status]}>{SERVICE_STATUS_LABELS[status]}</Badge>
}

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
    let cancelled = false

    getMonitorVideos()
      .then((data) => {
        if (!cancelled) setVideos(data)
      })
      .catch(() => {
        if (!cancelled) setVideos([])
      })
      .finally(() => {
        if (!cancelled) setVideoLoading(false)
      })

    getServerVideoVolume().then((v) => {
      if (!cancelled) setVideoVolume(v)
    })

    return () => {
      cancelled = true
    }
  }, [])

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
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <PageHeader
        title="Dashboard"
        description="Pantau dan kelola seluruh antrian secara real-time."
        actions={
          <Button
            variant="outline"
            onClick={() => fetchData()}
            disabled={loading}
          >
            <RefreshCwIcon className={loading ? 'animate-spin' : ''} data-icon="inline-start" />
            Refresh
          </Button>
        }
      />

      {/* Statistik */}
      <section aria-label="Statistik antrian">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {stats ? (
            <>
              <StatCard label="Total" value={stats.total} tone="neutral" icon={ActivityIcon} />
              <StatCard label="Menunggu" value={stats.waiting} tone="amber" icon={ClockIcon} />
              <StatCard label="Dipanggil" value={stats.called} tone="blue" icon={BellRingIcon} />
              <StatCard label="Dilayani" value={stats.serving} tone="emerald" icon={UserCheckIcon} />
              <StatCard label="Selesai" value={stats.completed} tone="green" icon={CheckCircle2Icon} />
              <StatCard label="Dilewati" value={stats.skipped} tone="gray" icon={SkipForwardIcon} />
            </>
          ) : (
            <>
              <StatCard label="Total" value={0} tone="neutral" icon={ActivityIcon} loading />
              <StatCard label="Menunggu" value={0} tone="amber" icon={ClockIcon} loading />
              <StatCard label="Dipanggil" value={0} tone="blue" icon={BellRingIcon} loading />
              <StatCard label="Dilayani" value={0} tone="emerald" icon={UserCheckIcon} loading />
              <StatCard label="Selesai" value={0} tone="green" icon={CheckCircle2Icon} loading />
              <StatCard label="Dilewati" value={0} tone="gray" icon={SkipForwardIcon} loading />
            </>
          )}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        {/* Kolom utama */}
        <div className="space-y-6 xl:col-span-2">
          {/* Status loket */}
          <section aria-label="Status loket">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {Object.entries(COUNTER_SERVICE_MAP).map(([numStr, serviceType]) => {
                const num = Number(numStr)
                const active = counters[num - 1]
                const isPaused = counterStatus[num] ?? false
                return (
                  <Card key={num}>
                    <CardHeader className="pb-0">
                      <CardTitle className="flex items-center gap-2 text-sm font-medium">
                        <span
                          className="size-2 shrink-0 rounded-full"
                          style={{ backgroundColor: WEEKDAY_COLORS[serviceType] }}
                          aria-hidden="true"
                        />
                        <span className="truncate">{getServiceLabel(serviceType)}</span>
                        {isPaused && (
                          <Badge className="ml-auto bg-amber-50 text-amber-700 ring-1 ring-amber-200">
                            Istirahat
                          </Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-center">
                      {isPaused ? (
                        <div className="py-5 text-sm text-muted-foreground">Loket istirahat</div>
                      ) : loading ? (
                        <div className="py-3">
                          <Skeleton className="mx-auto h-9 w-24" />
                          <Skeleton className="mx-auto mt-2 h-3 w-16" />
                        </div>
                      ) : active ? (
                        <>
                          <div className="py-1 text-4xl font-semibold tracking-tight text-emerald-600 tabular-nums">
                            {active.queueNumber}
                          </div>
                          <div className="mt-1 text-xs font-medium text-foreground">
                            {getServiceLabel(active.serviceType)}
                          </div>
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {active.status === 'serving' ? 'Dilayani' : 'Dipanggil'} •{' '}
                            <span className="tabular-nums">{formatElapsed(active.calledAt, now)}</span>
                          </div>
                        </>
                      ) : (
                        <div className="py-5 text-sm text-muted-foreground">Tidak ada</div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </section>

          {/* Antrian menunggu */}
          <Card>
            <CardHeader className="flex-row items-center justify-between gap-4 space-y-0 [.border-b]:pb-4">
              <div>
                <CardTitle>Antrian Menunggu</CardTitle>
                <CardDescription>{waitingQueue.length} tiket dalam antrean</CardDescription>
              </div>
              <Badge variant="secondary" className="tabular-nums">
                {waitingQueue.length}
              </Badge>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex flex-col gap-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-lg" />
                  ))}
                </div>
              ) : waitingQueue.length === 0 ? (
                <EmptyState
                  icon={InboxIcon}
                  title="Tidak ada antrian"
                  description="Semua tiket sudah dilayani. Antrian baru akan muncul di sini."
                  compact
                />
              ) : (
                <div className="max-h-72 overflow-auto">
                  <div className="min-w-[620px]">
                    <div className="grid grid-cols-[8rem_1fr_10.5rem_6.5rem] gap-2 border-b border-border px-3 pb-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                      <span>No. Tiket</span>
                      <span>Layanan</span>
                      <span>Waktu</span>
                      <span className="text-right">Status</span>
                    </div>
                    {waitingQueue.map((q) => (
                      <div
                        key={q.id}
                        className="grid grid-cols-[8rem_1fr_10.5rem_6.5rem] items-center gap-2 border-b border-border/70 px-3 py-3 transition-colors last:border-b-0 hover:bg-muted/40"
                      >
                        <span className="text-sm font-semibold tabular-nums text-foreground">
                          {q.queueNumber}
                        </span>
                        <span className="truncate text-sm text-muted-foreground capitalize">
                          {getServiceLabel(q.serviceType)}
                        </span>
                        <span className="text-xs tabular-nums whitespace-nowrap text-muted-foreground">
                          {formatDateTimeId(q.createdAt)}
                        </span>
                        <span className="flex justify-end">
                          <QueueStatusBadge status={q.status} />
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Grafik mingguan */}
          <Card>
            <CardHeader className="flex-row items-start justify-between gap-4 space-y-0 [.border-b]:pb-4">
              <div>
                <CardTitle>Perbandingan Layanan Mingguan</CardTitle>
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

        {/* Kolom samping */}
        <div className="space-y-6">
          {/* Riwayat selesai */}
          <Card>
            <CardHeader className="flex-row items-center justify-between gap-4 space-y-0 [.border-b]:pb-4">
              <div>
                <CardTitle>Riwayat Selesai</CardTitle>
                <CardDescription>20 tiket terakhir yang diselesaikan</CardDescription>
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
              {loading ? (
                <div className="flex flex-col gap-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-lg" />
                  ))}
                </div>
              ) : recentCompleted.length === 0 ? (
                <EmptyState
                  icon={HistoryIcon}
                  title="Belum ada riwayat"
                  description="Tiket yang sudah selesai akan tercatat di sini."
                  compact
                />
              ) : (
                <div className="max-h-[22rem] space-y-2 overflow-y-auto pr-1">
                  {recentCompleted.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border px-3.5 py-3 transition-colors hover:bg-muted/40"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-semibold tabular-nums text-foreground">
                          {ticket.queueNumber}
                        </div>
                        <div className="truncate text-xs text-muted-foreground capitalize">
                          {getServiceLabel(ticket.serviceType)}
                          {ticket.counterNumber && ` • Loket ${ticket.counterNumber}`}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-xs font-medium tabular-nums whitespace-nowrap text-foreground">
                          {formatDateId(ticket.completedAt)}
                        </div>
                        <div className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">
                          {formatTimeId(ticket.completedAt)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Operasi cepat */}
          <Card>
            <CardHeader className="[.border-b]:pb-4">
              <CardTitle>Operasi Cepat</CardTitle>
              <CardDescription>Aksi administratif pada data antrian.</CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <RotateCcwIcon data-icon="inline-start" />
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
            </CardContent>
          </Card>

          {/* Media monitor TV */}
          <Card>
            <CardHeader className="[.border-b]:pb-4">
              <div className="flex w-full items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <VideoIcon className="size-4" aria-hidden="true" />
                  </div>
                  <div>
                    <CardTitle>Media Monitor TV</CardTitle>
                    <CardDescription>
                      {videos.length} video • volume {Math.round(videoVolume * 100)}%
                    </CardDescription>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-expanded={showVideoSection}
                  aria-label={showVideoSection ? 'Tutup bagian media' : 'Buka bagian media'}
                  onClick={() => setShowVideoSection((prev) => !prev)}
                >
                  {showVideoSection ? <ChevronUpIcon /> : <ChevronDownIcon />}
                </Button>
              </div>
            </CardHeader>
            {showVideoSection && (
              <CardContent className="pt-0">
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="flex w-full cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground transition-colors hover:border-ring hover:bg-accent/60 hover:text-foreground"
                >
                  <UploadIcon className="size-6" aria-hidden="true" />
                  <span className="font-medium">Klik untuk upload video baru</span>
                  <span className="text-[11px] text-muted-foreground">
                    MP4, MOV, AVI, WMV, WEBM — maks 200MB
                  </span>
                </button>

                <input
                  ref={inputRef}
                  type="file"
                  accept="video/mp4,video/quicktime,video/x-msvideo,video/x-ms-wmv,video/webm"
                  className="hidden"
                  onChange={handleFileSelect}
                />

                {videoUploading && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
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
                  <div className="mt-3 max-h-[20rem] space-y-2 overflow-y-auto pr-1">
                    {videos.map((v) => (
                      <div
                        key={v.filename}
                        className="overflow-hidden rounded-xl border border-border bg-card"
                      >
                        <video
                          src={v.url}
                          className="h-28 w-full bg-black object-cover"
                          controls
                        >
                          Browser tidak mendukung video.
                        </video>
                        <div className="flex items-center justify-between gap-2 px-3 py-2">
                          <span className="truncate text-xs text-muted-foreground">{v.filename}</span>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            aria-label={`Hapus ${v.filename}`}
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => handleDeleteVideo(v.filename)}
                            disabled={deleting === v.filename}
                          >
                            {deleting === v.filename ? (
                              <RefreshCwIcon className="animate-spin" />
                            ) : (
                              <Trash2Icon />
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-4 border-t border-border pt-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <Volume2Icon className="size-4 text-muted-foreground" aria-hidden="true" />
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
                    className="mt-2.5 h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
                  />
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {videoVolume === 0
                      ? 'Video akan senyap (mute)'
                      : `Video akan diputar dengan volume ${Math.round(videoVolume * 100)}% — suara antrian tidak terganggu`}
                    {volumeSaving && ' • Menyimpan...'}
                  </p>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
