import type { QueueStatus, ServiceType } from '../types/queue'

export const SERVICE_TYPE_ORDER: ServiceType[] = [
  'pengaduan',
  'pb_pd_migrasi',
  'p2tl',
]

export type ServiceGroup = 'group_a' | 'group_b'

const SERVICE_GROUP_MAP: Record<ServiceType, ServiceGroup> = {
  pengaduan: 'group_a',
  pb_pd_migrasi: 'group_a',
  p2tl: 'group_b',
}

export const SERVICE_GROUP_LABELS: Record<ServiceGroup, string> = {
  group_a: 'Pengaduan & PB/PD/Migrasi',
  group_b: 'P2TL',
}

export function getServiceGroup(serviceType: ServiceType): ServiceGroup {
  return SERVICE_GROUP_MAP[serviceType] ?? 'group_a'
}

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

export const SERVICE_STATUS_LABELS: Record<QueueStatus, string> = {
  waiting: 'Menunggu',
  called: 'Dipanggil',
  serving: 'Dilayani',
  completed: 'Selesai',
  skipped: 'Dilewati',
}

export const STATUS_BADGE_COLOR: Record<QueueStatus, string> = {
  waiting: 'bg-yellow-100 text-yellow-800',
  called: 'bg-blue-100 text-blue-800',
  serving: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  skipped: 'bg-gray-100 text-gray-600',
}


