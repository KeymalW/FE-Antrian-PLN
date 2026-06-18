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
  type WeeklyCounterChartRow,
  type WeeklyCounterKey,
} from '../../lib/weeklyCounterChart'

interface ServiceSummaryChartProps {
  rows: WeeklyCounterChartRow[]
  embedded?: boolean
}

const chartHeight = 420
function escapeCsv(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`
  }

  return value
}

function downloadCsv(rows: WeeklyCounterChartRow[]) {
  const header = ['Hari', 'Loket 1', 'Loket 2', 'Loket 3', 'Total']
  const lines = [
    header.join(','),
    ...rows.map((row) => [
      row.label,
      row.counter1,
      row.counter2,
      row.counter3,
      row.total,
    ].map((value) => escapeCsv(String(value))).join(',')),
  ]

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = url
  anchor.download = `diagram-loket-mingguan-${new Date().toISOString().slice(0, 10)}.csv`
  anchor.click()

  URL.revokeObjectURL(url)
}

async function downloadExcel(rows: WeeklyCounterChartRow[]) {
  const XLSX = await import('xlsx')
  const workbook = XLSX.utils.book_new()
  const sheetData = rows.map((row) => ({
    Hari: row.label,
    'Loket 1': row.counter1,
    'Loket 2': row.counter2,
    'Loket 3': row.counter3,
    Total: row.total,
  }))
  const sheet = XLSX.utils.json_to_sheet(sheetData)

  XLSX.utils.book_append_sheet(workbook, sheet, 'Mingguan')
  XLSX.writeFile(workbook, `diagram-loket-mingguan-${new Date().toISOString().slice(0, 10)}.xlsx`)
}

function CustomLegend() {
  return (
    <div className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
      {(['counter1', 'counter2', 'counter3'] as WeeklyCounterKey[]).map((key) => (
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
          const key = item.dataKey as WeeklyCounterKey
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
      Belum ada data loket minggu ini
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
            <Bar dataKey="counter1" name={WEEKDAY_LABELS.counter1} fill={WEEKDAY_COLORS.counter1} radius={[4, 4, 0, 0]} />
            <Bar dataKey="counter2" name={WEEKDAY_LABELS.counter2} fill={WEEKDAY_COLORS.counter2} radius={[4, 4, 0, 0]} />
            <Bar dataKey="counter3" name={WEEKDAY_LABELS.counter3} fill={WEEKDAY_COLORS.counter3} radius={[4, 4, 0, 0]} />
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
        onClick={() => downloadCsv(chartData)}
        disabled={empty}
      >
        <DownloadIcon />
        Download CSV
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => void downloadExcel(chartData)}
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
            Perbandingan Loket Mingguan
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Distribusi tiket per loket untuk hari kerja Senin sampai Jumat.
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
