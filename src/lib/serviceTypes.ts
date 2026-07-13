import type { QueueStatus, QueueTicket, ServiceType } from '../types/queue'

export const SERVICE_TYPE_ORDER: ServiceType[] = [
  'pengaduan',
  'pb_pd_migrasi',
  'p2tl',
]

const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  pengaduan: 'Pengaduan',
  pb_pd_migrasi: 'PB/PD/Migrasi',
  p2tl: 'P2TL',
}

function normalizeServiceKey(value: string) {
  return value.trim().toLowerCase()
}

function titleCase(value: string) {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
}

export function getServiceLabel(serviceType: string) {
  const normalized = normalizeServiceKey(serviceType)

  if (normalized in SERVICE_TYPE_LABELS) {
    return SERVICE_TYPE_LABELS[normalized as ServiceType]
  }

  return titleCase(serviceType)
}

export function getServiceSortScore(serviceType: string) {
  const normalized = normalizeServiceKey(serviceType)
  const knownIndex = SERVICE_TYPE_ORDER.indexOf(normalized as ServiceType)

  if (knownIndex >= 0) {
    return { group: 0, order: knownIndex, label: getServiceLabel(normalized) }
  }

  return { group: 1, order: 0, label: getServiceLabel(serviceType) }
}

export interface ServiceSummaryRow {
  serviceType: string
  label: string
  total: number
  waiting: number
  called: number
  serving: number
  completed: number
  skipped: number
}

export function buildServiceSummary(tickets: Pick<QueueTicket, 'serviceType' | 'status'>[]) {
  const summary = new Map<string, ServiceSummaryRow>()

  for (const ticket of tickets) {
    const serviceType = normalizeServiceKey(ticket.serviceType)
    const current = summary.get(serviceType) ?? {
      serviceType,
      label: getServiceLabel(serviceType),
      total: 0,
      waiting: 0,
      called: 0,
      serving: 0,
      completed: 0,
      skipped: 0,
    }

    current.total += 1
    current[ticket.status as QueueStatus] += 1
    summary.set(serviceType, current)
  }

  return [...summary.values()].sort((a, b) => {
    const aScore = getServiceSortScore(a.serviceType)
    const bScore = getServiceSortScore(b.serviceType)

    if (aScore.group !== bScore.group) return aScore.group - bScore.group
    if (aScore.group === 0 && aScore.order !== bScore.order) {
      return aScore.order - bScore.order
    }

    return aScore.label.localeCompare(bScore.label, 'id')
  })
}

export const SERVICE_STATUS_ORDER: QueueStatus[] = [
  'waiting',
  'called',
  'serving',
  'completed',
  'skipped',
]

export const SERVICE_STATUS_LABELS: Record<QueueStatus, string> = {
  waiting: 'Menunggu',
  called: 'Dipanggil',
  serving: 'Dilayani',
  completed: 'Selesai',
  skipped: 'Dilewati',
}

export const SERVICE_STATUS_COLORS: Record<QueueStatus, string> = {
  waiting: '#9CA3AF',
  called: '#2563EB',
  serving: '#F59E0B',
  completed: '#16A34A',
  skipped: '#DC2626',
}

export interface ServiceChartRow {
  serviceType: ServiceType
  label: string
  waiting: number
  called: number
  serving: number
  completed: number
  skipped: number
  total: number
}

export function buildServiceChartData(tickets: Pick<QueueTicket, 'serviceType' | 'status'>[]) {
  const rows = new Map<ServiceType, ServiceChartRow>(
    SERVICE_TYPE_ORDER.map((serviceType) => [
      serviceType,
      {
        serviceType,
        label: getServiceLabel(serviceType),
        waiting: 0,
        called: 0,
        serving: 0,
        completed: 0,
        skipped: 0,
        total: 0,
      },
    ]),
  )

  for (const ticket of tickets) {
    const serviceType = normalizeServiceKey(ticket.serviceType) as ServiceType
    const row = rows.get(serviceType)

    if (!row) continue

    row[ticket.status] += 1
    row.total += 1
  }

  return SERVICE_TYPE_ORDER.map((serviceType) => rows.get(serviceType)!)
}

export function isServiceChartEmpty(rows: ServiceChartRow[]) {
  return rows.every((row) => row.total === 0)
}
