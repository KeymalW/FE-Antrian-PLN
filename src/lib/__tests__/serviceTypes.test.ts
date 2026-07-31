import { describe, it, expect } from 'vitest'
import {
  SERVICE_TYPE_ORDER,
  getServiceLabel,
  getServiceSortScore,
  SERVICE_STATUS_LABELS,
} from '../serviceTypes'

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

describe('SERVICE_STATUS_LABELS', () => {
  it('has labels for all statuses', () => {
    expect(SERVICE_STATUS_LABELS.waiting).toBe('Menunggu')
    expect(SERVICE_STATUS_LABELS.called).toBe('Dipanggil')
    expect(SERVICE_STATUS_LABELS.serving).toBe('Dilayani')
    expect(SERVICE_STATUS_LABELS.completed).toBe('Selesai')
    expect(SERVICE_STATUS_LABELS.skipped).toBe('Dilewati')
  })
})


