import type { QueueTicket } from '../types/queue'

export type WeeklyCounterKey = 'counter1' | 'counter2' | 'counter3'

export interface WeeklyCounterChartRow {
  day: string
  label: string
  counter1: number
  counter2: number
  counter3: number
  total: number
}

export const WEEKDAY_ORDER = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'] as const

export const WEEKDAY_COLORS: Record<WeeklyCounterKey, string> = {
  counter1: '#2563EB',
  counter2: '#F59E0B',
  counter3: '#16A34A',
}

export const WEEKDAY_LABELS: Record<WeeklyCounterKey, string> = {
  counter1: 'Loket 1',
  counter2: 'Loket 2',
  counter3: 'Loket 3',
}

function startOfMonday(date: Date) {
  const result = new Date(date)
  result.setHours(0, 0, 0, 0)
  const day = result.getDay()
  const diff = day === 0 ? -6 : 1 - day
  result.setDate(result.getDate() + diff)
  return result
}

function formatDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatWeekday(date: Date) {
  return date.toLocaleDateString('id-ID', { weekday: 'long' })
}

function getChartTimestamp(ticket: Pick<QueueTicket, 'calledAt' | 'completedAt' | 'createdAt'>) {
  return ticket.calledAt ?? ticket.completedAt ?? ticket.createdAt
}

export function buildWeeklyCounterChartData(
  tickets: Pick<QueueTicket, 'counterNumber' | 'calledAt' | 'completedAt' | 'createdAt'>[],
) {
  const today = new Date()
  const monday = startOfMonday(today)
  const friday = new Date(monday)
  friday.setDate(monday.getDate() + 4)
  friday.setHours(23, 59, 59, 999)

  const rows = WEEKDAY_ORDER.map((label, index) => {
    const day = new Date(monday)
    day.setDate(monday.getDate() + index)

    return {
      day: formatDateKey(day),
      label,
      counter1: 0,
      counter2: 0,
      counter3: 0,
      total: 0,
    } satisfies WeeklyCounterChartRow
  })

  const rowMap = new Map(rows.map((row) => [row.day, row] as const))

  for (const ticket of tickets) {
    if (!ticket.counterNumber || ticket.counterNumber < 1 || ticket.counterNumber > 3) continue

    const ticketDate = new Date(getChartTimestamp(ticket))
    if (Number.isNaN(ticketDate.getTime())) continue
    if (ticketDate < monday || ticketDate > friday) continue

    const dayKey = ticketDate.toISOString().slice(0, 10)
    const row = rowMap.get(dayKey)
    if (!row) continue

    const counterKey = `counter${ticket.counterNumber}` as WeeklyCounterKey
    row[counterKey] += 1
    row.total += 1
  }

  return rows.map((row) => ({
    ...row,
    label: formatWeekday(new Date(`${row.day}T00:00:00`)),
  }))
}

export function isWeeklyCounterChartEmpty(rows: WeeklyCounterChartRow[]) {
  return rows.every((row) => row.total === 0)
}
