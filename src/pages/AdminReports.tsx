import { useCallback, useEffect, useRef, useState, lazy, Suspense } from 'react'
import { toast } from 'sonner'
import { getQueueList } from '../services/queue'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Input } from '../components/ui/input'
import { Skeleton } from '../components/ui/skeleton'
import { PageHeader } from '../components/admin/PageHeader'
import { EmptyState } from '../components/admin/EmptyState'
import { StatCard } from '../components/admin/StatCard'
import {
  CalendarDaysIcon,
  CheckCircle2Icon,
  DownloadIcon,
  FileSpreadsheetIcon,
  InboxIcon,
  RefreshCwIcon,
  SkipForwardIcon,
  ActivityIcon,
} from 'lucide-react'
import { cn } from '../lib/utils'
import { getServiceLabel, SERVICE_STATUS_LABELS, STATUS_BADGE_COLOR } from '../lib/serviceTypes'
import type { QueueStatus, QueueTicket } from '../types/queue'
import { buildWeeklyCounterChartData, type WeeklyServiceChartRow } from '../lib/weeklyCounterChart'
import { downloadTableCsv, downloadTableExcel } from '../lib/chartExport'
import { formatDateId, formatDateTimeId } from '../lib/datetime'

const ServiceSummaryChart = lazy(() =>
  import('../components/dashboard/ServiceSummaryChart').then((module) => ({
    default: module.ServiceSummaryChart,
  })),
)

function toISODate(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function rangeThisMonth() {
  const now = new Date()
  return {
    from: toISODate(new Date(now.getFullYear(), now.getMonth(), 1)),
    to: toISODate(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  }
}

function rangeLastMonth() {
  const now = new Date()
  return {
    from: toISODate(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
    to: toISODate(new Date(now.getFullYear(), now.getMonth(), 0)),
  }
}

function rangeLastDays(days: number) {
  const now = new Date()
  return {
    from: toISODate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - days + 1)),
    to: toISODate(now),
  }
}

const PRESETS = [
  { label: 'Bulan Ini', get: rangeThisMonth },
  { label: 'Bulan Lalu', get: rangeLastMonth },
  { label: '7 Hari', get: () => rangeLastDays(7) },
  { label: '30 Hari', get: () => rangeLastDays(30) },
] as const

function StatusBadge({ status }: { status: QueueStatus }) {
  return <Badge className={STATUS_BADGE_COLOR[status]}>{SERVICE_STATUS_LABELS[status]}</Badge>
}

export default function AdminReports() {
  const initial = rangeThisMonth()
  const [from, setFrom] = useState(initial.from)
  const [to, setTo] = useState(initial.to)
  const [tickets, setTickets] = useState<QueueTicket[]>([])
  const [loading, setLoading] = useState(true)
  const fetchIdRef = useRef(0)

  const fetchData = useCallback(async () => {
    const id = ++fetchIdRef.current
    setLoading(true)
    try {
      const data = await getQueueList({ from, to, perPage: 1000 })
      if (id !== fetchIdRef.current) return
      setTickets(data)
    } catch {
      if (id !== fetchIdRef.current) return
      toast.error('Gagal memuat riwayat antrian')
    } finally {
      if (id === fetchIdRef.current) setLoading(false)
    }
  }, [from, to])

  useEffect(() => {
    const timer = window.setTimeout(() => void fetchData(), 0)
    return () => window.clearTimeout(timer)
  }, [fetchData])

  const sortedDesc = [...tickets].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const summary = tickets.reduce(
    (acc, ticket) => {
      acc.total += 1
      if (ticket.status === 'completed') acc.completed += 1
      if (ticket.status === 'skipped') acc.skipped += 1
      if (ticket.status === 'waiting' || ticket.status === 'called' || ticket.status === 'serving') {
        acc.active += 1
      }
      return acc
    },
    { total: 0, completed: 0, skipped: 0, active: 0 },
  )
  const chartRows: WeeklyServiceChartRow[] = buildWeeklyCounterChartData(tickets)

  const applyPreset = (get: typeof rangeThisMonth) => {
    const range = get()
    setFrom(range.from)
    setTo(range.to)
  }

  const exportCsv = () => {
    downloadTableCsv(
      `riwayat-antrian-${from}_${to}.csv`,
      ['No. Tiket', 'Layanan', 'Status', 'Loket', 'Dibuat', 'Selesai'],
      sortedDesc.map((t) => [
        t.queueNumber,
        getServiceLabel(t.serviceType),
        SERVICE_STATUS_LABELS[t.status],
        t.counterNumber ?? '-',
        formatDateTimeId(t.createdAt),
        t.completedAt ? formatDateTimeId(t.completedAt) : '-',
      ]),
    )
  }

  const exportExcel = async () => {
    await downloadTableExcel(
      `riwayat-antrian-${from}_${to}.xlsx`,
      'Riwayat',
      sortedDesc.map((t) => ({
        'No. Tiket': t.queueNumber,
        Layanan: getServiceLabel(t.serviceType),
        Status: SERVICE_STATUS_LABELS[t.status],
        Loket: t.counterNumber ?? '-',
        Dibuat: formatDateTimeId(t.createdAt),
        Selesai: t.completedAt ? formatDateTimeId(t.completedAt) : '-',
      })),
    )
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <PageHeader
        title="Laporan"
        description="Riwayat layanan dan performa antrian per rentang waktu."
        actions={
          <>
            <Button variant="outline" onClick={() => void exportCsv()} disabled={loading || tickets.length === 0}>
              <DownloadIcon data-icon="inline-start" />
              CSV
            </Button>
            <Button variant="outline" onClick={() => void exportExcel()} disabled={loading || tickets.length === 0}>
              <FileSpreadsheetIcon data-icon="inline-start" />
              Excel
            </Button>
          </>
        }
      />

      {/* Filter tanggal */}
      <Card size="sm">
        <CardContent className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="space-y-1">
              <label htmlFor="report-from" className="text-xs font-medium text-muted-foreground">
                Dari Tanggal
              </label>
              <Input
                id="report-from"
                type="date"
                value={from}
                max={to}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full sm:w-40"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="report-to" className="text-xs font-medium text-muted-foreground">
                Sampai Tanggal
              </label>
              <Input
                id="report-to"
                type="date"
                value={to}
                min={from}
                onChange={(e) => setTo(e.target.value)}
                className="w-full sm:w-40"
              />
            </div>
            <Button variant="outline" onClick={() => fetchData()} disabled={loading}>
              <RefreshCwIcon className={loading ? 'animate-spin' : ''} data-icon="inline-start" />
              Muat Ulang
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <CalendarDaysIcon className="mr-1 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            {PRESETS.map((preset) => {
              const range = preset.get()
              const active = from === range.from && to === range.to
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => applyPreset(preset.get)}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  )}
                >
                  {preset.label}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Ringkasan */}
      <section aria-label="Ringkasan periode">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Total Tiket" value={summary.total} tone="neutral" icon={ActivityIcon} loading={loading} />
          <StatCard label="Selesai" value={summary.completed} tone="green" icon={CheckCircle2Icon} loading={loading} />
          <StatCard label="Dilewati" value={summary.skipped} tone="amber" icon={SkipForwardIcon} loading={loading} />
          <StatCard label="Masih Aktif" value={summary.active} tone="blue" icon={RefreshCwIcon} loading={loading} />
        </div>
      </section>

      {/* Grafik */}
      <Card>
        <CardHeader className="[.border-b]:pb-4">
          <CardTitle>Distribusi Layanan</CardTitle>
          <CardDescription>
            Periode {formatDateId(from)} – {formatDateId(to)} · hari kerja Senin–Jumat.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-[26rem] w-full rounded-xl" />
          ) : (
            <Suspense fallback={<Skeleton className="h-[26rem] w-full rounded-xl" />}>
              <ServiceSummaryChart rows={chartRows} embedded />
            </Suspense>
          )}
        </CardContent>
      </Card>

      {/* Riwayat */}
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-4 space-y-0 [.border-b]:pb-4">
          <div>
            <CardTitle>Riwayat Layanan</CardTitle>
            <CardDescription>
              {loading ? 'Memuat…' : `${tickets.length} tiket dalam rentang ini`}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-11 w-full rounded-lg" />
              ))}
            </div>
          ) : tickets.length === 0 ? (
            <EmptyState
              icon={InboxIcon}
              title="Tidak ada riwayat pada rentang ini"
              description="Coba pilih rentang tanggal lain untuk melihat riwayat antrian bulan-bulan sebelumnya."
            />
          ) : (
            <div className="max-h-[30rem] overflow-auto">
              <div className="min-w-[720px]">
                <div className="grid grid-cols-[8rem_1fr_7rem_4.5rem_11rem_11rem] gap-2 border-b border-border px-3 pb-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  <span>No. Tiket</span>
                  <span>Layanan</span>
                  <span>Status</span>
                  <span>Loket</span>
                  <span>Dibuat</span>
                  <span>Selesai</span>
                </div>
                {sortedDesc.map((t) => (
                  <div
                    key={t.id}
                    className="grid grid-cols-[8rem_1fr_7rem_4.5rem_11rem_11rem] items-center gap-2 border-b border-border/70 px-3 py-2.5 transition-colors last:border-b-0 hover:bg-muted/40"
                  >
                    <span className="text-sm font-semibold tabular-nums text-foreground">
                      {t.queueNumber}
                    </span>
                    <span className="truncate text-sm capitalize text-muted-foreground">
                      {getServiceLabel(t.serviceType)}
                    </span>
                    <StatusBadge status={t.status} />
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {t.counterNumber ?? '—'}
                    </span>
                    <span className="text-xs tabular-nums whitespace-nowrap text-muted-foreground">
                      {formatDateTimeId(t.createdAt)}
                    </span>
                    <span className="text-xs tabular-nums whitespace-nowrap text-muted-foreground">
                      {t.completedAt ? formatDateTimeId(t.completedAt) : '—'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
