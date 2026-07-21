import { describe, it, expect } from 'vitest'
import {
  buildWeeklyCounterChartData,
  isWeeklyCounterChartEmpty,
  WEEKDAY_ORDER,
  WEEKDAY_COLORS,
  WEEKDAY_LABELS,
} from '../weeklyCounterChart'
import type { QueueTicket } from '../../types/queue'

function makeTicket(overrides: Partial<QueueTicket> & { createdAt: string }): QueueTicket {
  return {
    id: '1',
    queueNumber: 'G-001',
    serviceType: 'pengaduan',
    status: 'completed',
    counterNumber: 1,
    calledAt: null,
    completedAt: null,
    ...overrides,
  }
}

describe('buildWeeklyCounterChartData', () => {
  it('returns 5 rows for Senin-Jumat with zero counts when no tickets', () => {
    const rows = buildWeeklyCounterChartData([])

    expect(rows).toHaveLength(5)
    rows.forEach((row) => {
      expect(row.total).toBe(0)
      expect(row.pengaduan).toBe(0)
      expect(row.pb_pd_migrasi).toBe(0)
      expect(row.p2tl).toBe(0)
    })
  })

  it('labels rows as Senin through Jumat', () => {
    const rows = buildWeeklyCounterChartData([])
    const labels = rows.map((r) => r.label)
    expect(labels).toEqual(['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'])
  })

  it('counts pengaduan tickets on correct weekday', () => {
    const today = new Date()
    const day = today.getDay()
    const diff = day === 0 ? -6 : 1 - day
    const monday = new Date(today)
    monday.setDate(today.getDate() + diff)

    const tickets = [
      makeTicket({ createdAt: monday.toISOString(), serviceType: 'pengaduan' }),
      makeTicket({ id: '2', createdAt: monday.toISOString(), serviceType: 'pengaduan' }),
    ]

    const rows = buildWeeklyCounterChartData(tickets)
    expect(rows[0].pengaduan).toBe(2)
    expect(rows[0].total).toBe(2)
  })

  it('skips tickets on Saturday', () => {
    const today = new Date()
    const day = today.getDay()
    const diff = day === 0 ? -6 : 1 - day
    const monday = new Date(today)
    monday.setDate(today.getDate() + diff)
    const saturday = new Date(monday)
    saturday.setDate(monday.getDate() + 5)

    const tickets = [
      makeTicket({ createdAt: saturday.toISOString(), serviceType: 'pengaduan' }),
    ]

    const rows = buildWeeklyCounterChartData(tickets)
    rows.forEach((row) => {
      expect(row.total).toBe(0)
    })
  })

  it('skips tickets on Sunday', () => {
    const today = new Date()
    const day = today.getDay()
    const diff = day === 0 ? -6 : 1 - day
    const monday = new Date(today)
    monday.setDate(today.getDate() + diff)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)

    const tickets = [
      makeTicket({ createdAt: sunday.toISOString(), serviceType: 'pengaduan' }),
    ]

    const rows = buildWeeklyCounterChartData(tickets)
    rows.forEach((row) => {
      expect(row.total).toBe(0)
    })
  })

  it('distributes tickets across multiple service types', () => {
    const today = new Date()
    const day = today.getDay()
    const diff = day === 0 ? -6 : 1 - day
    const monday = new Date(today)
    monday.setDate(today.getDate() + diff)

    const tickets = [
      makeTicket({ createdAt: monday.toISOString(), serviceType: 'pengaduan' }),
      makeTicket({ id: '2', createdAt: monday.toISOString(), serviceType: 'pb_pd_migrasi' }),
      makeTicket({ id: '3', createdAt: monday.toISOString(), serviceType: 'p2tl' }),
    ]

    const rows = buildWeeklyCounterChartData(tickets)
    expect(rows[0].pengaduan).toBe(1)
    expect(rows[0].pb_pd_migrasi).toBe(1)
    expect(rows[0].p2tl).toBe(1)
    expect(rows[0].total).toBe(3)
  })

  it('prefers calledAt over createdAt for date', () => {
    const today = new Date()
    const day = today.getDay()
    const diff = day === 0 ? -6 : 1 - day
    const monday = new Date(today)
    monday.setDate(today.getDate() + diff)
    const tuesday = new Date(monday)
    tuesday.setDate(monday.getDate() + 1)

    const tickets = [
      makeTicket({
        createdAt: monday.toISOString(),
        calledAt: tuesday.toISOString(),
        serviceType: 'pengaduan',
      }),
    ]

    const rows = buildWeeklyCounterChartData(tickets)
    expect(rows[0].pengaduan).toBe(0)
    expect(rows[1].pengaduan).toBe(1)
  })

  it('ignores tickets with invalid serviceType', () => {
    const today = new Date()
    const day = today.getDay()
    const diff = day === 0 ? -6 : 1 - day
    const monday = new Date(today)
    monday.setDate(today.getDate() + diff)

    const tickets = [
      makeTicket({ createdAt: monday.toISOString(), serviceType: 'pengaduan' }),
      { ...makeTicket({ id: '2', createdAt: monday.toISOString() }), serviceType: 'unknown' as any },
    ]

    const rows = buildWeeklyCounterChartData(tickets)
    expect(rows[0].total).toBe(1)
  })

  it('ignores tickets with invalid dates', () => {
    const tickets = [
      makeTicket({ createdAt: 'not-a-date', serviceType: 'pengaduan' }),
    ]

    const rows = buildWeeklyCounterChartData(tickets)
    rows.forEach((row) => {
      expect(row.total).toBe(0)
    })
  })
})

describe('isWeeklyCounterChartEmpty', () => {
  it('returns true when all totals are zero', () => {
    const rows = buildWeeklyCounterChartData([])
    expect(isWeeklyCounterChartEmpty(rows)).toBe(true)
  })

  it('returns false when at least one row has data', () => {
    const today = new Date()
    const day = today.getDay()
    const diff = day === 0 ? -6 : 1 - day
    const monday = new Date(today)
    monday.setDate(today.getDate() + diff)

    const tickets = [
      makeTicket({ createdAt: monday.toISOString(), serviceType: 'pengaduan' }),
    ]
    const rows = buildWeeklyCounterChartData(tickets)
    expect(isWeeklyCounterChartEmpty(rows)).toBe(false)
  })
})

describe('WEEKDAY_LABELS', () => {
  it('has labels for all service types', () => {
    expect(WEEKDAY_LABELS.pengaduan).toBe('Pengaduan')
    expect(WEEKDAY_LABELS.pb_pd_migrasi).toBe('PB/PD/Migrasi')
    expect(WEEKDAY_LABELS.p2tl).toBe('P2TL')
  })
})

describe('WEEKDAY_COLORS', () => {
  it('has hex colors for all service types', () => {
    Object.values(WEEKDAY_COLORS).forEach((color) => {
      expect(color).toMatch(/^#[0-9A-F]{6}$/i)
    })
  })
})
