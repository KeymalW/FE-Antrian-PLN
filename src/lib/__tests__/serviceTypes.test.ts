import { describe, it, expect } from 'vitest'
import {
  SERVICE_TYPE_ORDER,
  getServiceLabel,
  getServiceSortScore,
  buildServiceSummary,
  buildServiceChartData,
  isServiceChartEmpty,
  SERVICE_STATUS_LABELS,
  SERVICE_STATUS_COLORS,
} from '../serviceTypes'
import type { QueueTicket } from '../../types/queue'

function makeTicket(overrides: Partial<QueueTicket> = {}): QueueTicket {
  return {
    id: '1',
    queueNumber: 'G-001',
    serviceType: 'pengaduan',
    status: 'waiting',
    counterNumber: null,
    createdAt: new Date().toISOString(),
    calledAt: null,
    completedAt: null,
    ...overrides,
  }
}

describe('SERVICE_TYPE_ORDER', () => {
  it('contains 3 service types', () => {
    expect(SERVICE_TYPE_ORDER).toHaveLength(3)
  })

  it('has pengaduan, pb_pd_migrasi, p2tl', () => {
    expect(SERVICE_TYPE_ORDER).toEqual(['pengaduan', 'pb_pd_migrasi', 'p2tl'])
  })
})

describe('getServiceLabel', () => {
  it('returns correct labels for known types', () => {
    expect(getServiceLabel('pengaduan')).toBe('Pengaduan')
    expect(getServiceLabel('pb_pd_migrasi')).toBe('PB/PD/Migrasi')
    expect(getServiceLabel('p2tl')).toBe('P2TL')
  })

  it('title-cases unknown types', () => {
    expect(getServiceLabel('custom_type')).toBe('Custom_type')
  })
})

describe('getServiceSortScore', () => {
  it('returns group 0 for known types with correct order', () => {
    const score = getServiceSortScore('pengaduan')
    expect(score.group).toBe(0)
    expect(score.order).toBe(0)
  })

  it('returns group 1 for unknown types', () => {
    const score = getServiceSortScore('unknown')
    expect(score.group).toBe(1)
  })
})

describe('buildServiceSummary', () => {
  it('returns empty array for no tickets', () => {
    expect(buildServiceSummary([])).toHaveLength(0)
  })

  it('groups tickets by serviceType and status', () => {
    const tickets = [
      makeTicket({ serviceType: 'pengaduan', status: 'waiting' }),
      makeTicket({ id: '2', serviceType: 'pengaduan', status: 'completed' }),
      makeTicket({ id: '3', serviceType: 'p2tl', status: 'waiting' }),
    ]
    const summary = buildServiceSummary(tickets)
    expect(summary).toHaveLength(2)

    const pengaduan = summary.find((s) => s.serviceType === 'pengaduan')
    expect(pengaduan?.total).toBe(2)
    expect(pengaduan?.waiting).toBe(1)
    expect(pengaduan?.completed).toBe(1)

    const p2tl = summary.find((s) => s.serviceType === 'p2tl')
    expect(p2tl?.total).toBe(1)
  })
})

describe('buildServiceChartData', () => {
  it('returns rows for all 3 service types', () => {
    const rows = buildServiceChartData([])
    expect(rows).toHaveLength(3)
  })

  it('counts tickets per service type and status', () => {
    const tickets = [
      makeTicket({ serviceType: 'pengaduan', status: 'waiting' }),
      makeTicket({ id: '2', serviceType: 'pengaduan', status: 'called' }),
      makeTicket({ id: '3', serviceType: 'p2tl', status: 'completed' }),
    ]
    const rows = buildServiceChartData(tickets)

    const pengaduan = rows.find((r) => r.serviceType === 'pengaduan')
    expect(pengaduan?.waiting).toBe(1)
    expect(pengaduan?.called).toBe(1)
    expect(pengaduan?.total).toBe(2)
  })
})

describe('isServiceChartEmpty', () => {
  it('returns true when all totals are 0', () => {
    const rows = buildServiceChartData([])
    expect(isServiceChartEmpty(rows)).toBe(true)
  })

  it('returns false when there is data', () => {
    const rows = buildServiceChartData([makeTicket()])
    expect(isServiceChartEmpty(rows)).toBe(false)
  })
})

describe('SERVICE_STATUS_LABELS', () => {
  it('has labels for all statuses', () => {
    expect(SERVICE_STATUS_LABELS.waiting).toBe('Menunggu')
    expect(SERVICE_STATUS_LABELS.called).toBe('Dipanggil')
    expect(SERVICE_STATUS_LABELS.serving).toBe('Dilayani')
    expect(SERVICE_STATUS_LABELS.completed).toBe('Selesai')
    expect(SERVICE_STATUS_LABELS.skipped).toBe('Dilewati')
  })
})

describe('SERVICE_STATUS_COLORS', () => {
  it('has hex colors for all statuses', () => {
    Object.values(SERVICE_STATUS_COLORS).forEach((color) => {
      expect(color).toMatch(/^#[0-9A-F]{6}$/i)
    })
  })
})
