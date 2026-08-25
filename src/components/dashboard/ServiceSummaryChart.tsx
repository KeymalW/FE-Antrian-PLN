import { useMemo } from 'react'
import { BarChart3Icon, DownloadIcon, FileSpreadsheetIcon } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import {
  isWeeklyCounterChartEmpty,
  WEEKDAY_COLORS,
  WEEKDAY_LABELS,
  type WeeklyServiceChartRow,
  type WeeklyServiceKey,
} from '../../lib/weeklyCounterChart'
import {
  downloadWeeklyChartCsv,
  downloadWeeklyChartExcel,
} from '../../lib/chartExport'
import { SERVICE_TYPE_ORDER } from '../../lib/serviceTypes'

interface ServiceSummaryChartProps {
  rows: WeeklyServiceChartRow[]
  embedded?: boolean
}

const chartHeight = 420

function CustomLegend() {
  return (
    <div className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
      {SERVICE_TYPE_ORDER.map((key) => (
        <div key={key} className="flex items-center gap-2">
          <span
            className="size-3 rounded-sm"
            style={{ backgroundColor: WEEKDAY_COLORS[key] }}
            aria-hidden="true"
          />
          <span>{WEEKDAY_LABELS[key]}</span>
        </div>
      ))}
    </div>
  )
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ dataKey?: string; value?: number; color?: string }>
  label?: string
}) {
  if (!active || !payload || !payload.length) return null

  const total = payload.reduce((sum, item) => sum + (item.value ?? 0), 0)

  return (
    <div className="min-w-56 rounded-xl border border-border bg-background/95 p-3 shadow-lg backdrop-blur">
      <div className="text-sm font-semibold text-foreground">{label}</div>
      <div className="mt-2 space-y-1.5">
        {payload.map((item) => {
          const key = item.dataKey as WeeklyServiceKey
          if (!key || !(key in WEEKDAY_LABELS)) return null

          return (
            <div key={key} className="flex items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-2">
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: item.color ?? WEEKDAY_COLORS[key] }}
                  aria-hidden="true"
                />
                <span className="text-muted-foreground">{WEEKDAY_LABELS[key]}</span>
              </div>
              <span className="font-medium tabular-nums text-foreground">{item.value ?? 0}</span>
            </div>
          )
        })}
      </div>
      <div className="mt-3 border-t border-border pt-2 text-xs text-muted-foreground">
        Total: <span className="font-semibold text-foreground">{total}</span>
      </div>
    </div>
  )
}

export function ServiceSummaryChart({ rows, embedded = false }: ServiceSummaryChartProps) {
  const chartData = useMemo(() => rows, [rows])
  const empty = isWeeklyCounterChartEmpty(chartData)

  const content = empty ? (
    <div className="rounded-lg border border-dashed py-14 text-center text-sm text-muted-foreground">
      Belum ada data layanan minggu ini
    </div>
  ) : (
    <div className="overflow-x-auto">
      <div className="min-w-[760px]" style={{ height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 12, right: 20, left: 0, bottom: 8 }}
            barCategoryGap="18%"
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={{ stroke: 'var(--border)' }}
              interval={0}
            />
            <YAxis
              tickLine={false}
              axisLine={{ stroke: 'var(--border)' }}
              allowDecimals={false}
              width={42}
              domain={[0, 'dataMax']}
            />
            <Tooltip content={<ChartTooltip />} />
            <Legend content={<CustomLegend />} verticalAlign="bottom" />
            {SERVICE_TYPE_ORDER.map((key) => (
              <Bar
                key={key}
                dataKey={key}
                name={WEEKDAY_LABELS[key]}
                fill={WEEKDAY_COLORS[key]}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )

  const exportButtons = (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => downloadWeeklyChartCsv(chartData)}
        disabled={empty}
      >
        <DownloadIcon />
        Download CSV
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => void downloadWeeklyChartExcel(chartData)}
        disabled={empty}
      >
        <FileSpreadsheetIcon />
        Export Excel
      </Button>
    </div>
  )

  if (embedded) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">{exportButtons}</div>
        {content}
      </div>
    )
  }

  return (
    <Card className="rounded-[16px] shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <BarChart3Icon className="size-5 text-pln-cyan" />
            Perbandingan Layanan Mingguan
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Distribusi tiket per layanan untuk hari kerja Senin sampai Jumat.
          </p>
        </div>
        {exportButtons}
      </CardHeader>
      <CardContent className="pb-5">
        {content}
      </CardContent>
    </Card>
  )
}
