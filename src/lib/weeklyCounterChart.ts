import type { QueueTicket, ServiceType } from '../types/queue'
import { SERVICE_TYPE_ORDER, getServiceLabel } from './serviceTypes'

export type WeeklyServiceKey = ServiceType

export interface WeeklyServiceChartRow {
  day: string
  label: string
  pengaduan: number
  pb_pd_migrasi: number
  p2tl: number
  total: number
}

export const WEEKDAY_ORDER = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'] as const

export const WEEKDAY_COLORS: Record<WeeklyServiceKey, string> = {
  pengaduan: '#2563EB',
  pb_pd_migrasi: '#F59E0B',
  p2tl: '#16A34A',
}

export const WEEKDAY_LABELS: Record<WeeklyServiceKey, string> = {
  pengaduan: getServiceLabel('pengaduan'),
  pb_pd_migrasi: getServiceLabel('pb_pd_migrasi'),
  p2tl: getServiceLabel('p2tl'),
}

function startOfMonday(date: Date) {
  const result = new Date(date)
  result.setHours(0, 0, 0, 0)
  const day = result.getDay()
  const diff = day === 0 ? -6 : 1 - day
  result.setDate(result.getDate() + diff)
  return result
}

function formatWeekday(date: Date) {
  return date.toLocaleDateString('id-ID', { weekday: 'long' })
}

function getChartTimestamp(ticket: Pick<QueueTicket, 'calledAt' | 'completedAt' | 'createdAt'>) {
  return ticket.calledAt ?? ticket.completedAt ?? ticket.createdAt
}

export function buildWeeklyCounterChartData(
  tickets: Pick<QueueTicket, 'serviceType' | 'calledAt' | 'completedAt' | 'createdAt'>[],
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
      day: day.toISOString().slice(0, 10),
      label,
      pengaduan: 0,
      pb_pd_migrasi: 0,
      p2tl: 0,
      total: 0,
    } satisfies WeeklyServiceChartRow
  })

  const rowMap = new Map(rows.map((row) => [row.day, row] as const))

  for (const ticket of tickets) {
    if (!ticket.serviceType || !SERVICE_TYPE_ORDER.includes(ticket.serviceType as ServiceType)) continue

    const ticketDate = new Date(getChartTimestamp(ticket))
    if (Number.isNaN(ticketDate.getTime())) continue
    if (ticketDate < monday || ticketDate > friday) continue

    const dayKey = ticketDate.toISOString().slice(0, 10)
    const row = rowMap.get(dayKey)
    if (!row) continue

    const serviceKey = ticket.serviceType as WeeklyServiceKey
    row[serviceKey] += 1
    row.total += 1
  }

  return rows.map((row) => ({
    ...row,
    label: formatWeekday(new Date(`${row.day}T00:00:00`)),
  }))
}

export function isWeeklyCounterChartEmpty(rows: WeeklyServiceChartRow[]) {
  return rows.every((row) => row.total === 0)
}
