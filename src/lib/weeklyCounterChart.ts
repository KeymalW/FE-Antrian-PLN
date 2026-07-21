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

function getChartTimestamp(ticket: Pick<QueueTicket, 'calledAt' | 'completedAt' | 'createdAt'>) {
  return ticket.calledAt ?? ticket.completedAt ?? ticket.createdAt
}

export function buildWeeklyCounterChartData(
  tickets: Pick<QueueTicket, 'serviceType' | 'calledAt' | 'completedAt' | 'createdAt'>[],
) {
  const rows = WEEKDAY_ORDER.map((label) => ({
    dayIndex: WEEKDAY_ORDER.indexOf(label),
    label,
    pengaduan: 0,
    pb_pd_migrasi: 0,
    p2tl: 0,
    total: 0,
  } satisfies WeeklyServiceChartRow & { dayIndex: number }))

  for (const ticket of tickets) {
    if (!ticket.serviceType || !SERVICE_TYPE_ORDER.includes(ticket.serviceType as ServiceType)) continue

    const ticketDate = new Date(getChartTimestamp(ticket))
    if (Number.isNaN(ticketDate.getTime())) continue

    const ticketDay = ticketDate.getDay()
    const ticketDayIndex = ticketDay === 0 ? -1 : ticketDay - 1
    if (ticketDayIndex < 0 || ticketDayIndex > 4) continue

    const row = rows[ticketDayIndex]
    const serviceKey = ticket.serviceType as WeeklyServiceKey
    row[serviceKey] += 1
    row.total += 1
  }

  return rows.map((row) => ({
    ...row,
    day: String(row.dayIndex),
  }))
}

export function isWeeklyCounterChartEmpty(rows: WeeklyServiceChartRow[]) {
  return rows.every((row) => row.total === 0)
}
