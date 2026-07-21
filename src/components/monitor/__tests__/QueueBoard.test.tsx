import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { QueueBoard } from '../QueueBoard'
import type { QueueTicket } from '../../../types/queue'

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

describe('QueueBoard', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders empty state when no tickets', () => {
    render(<QueueBoard waitingList={[]} />)
    expect(screen.getByText('Tidak ada antrian')).toBeInTheDocument()
  })

  it('renders waiting count header', () => {
    const tickets = [makeTicket({ id: '1', queueNumber: 'G-001' })]
    render(<QueueBoard waitingList={tickets} />)
    expect(screen.getByText(/Antrian Menunggu \(1\)/)).toBeInTheDocument()
  })

  it('renders all tickets when 5 or fewer', () => {
    const tickets = Array.from({ length: 5 }, (_, i) =>
      makeTicket({ id: String(i + 1), queueNumber: `G-${String(i + 1).padStart(3, '0')}` })
    )
    render(<QueueBoard waitingList={tickets} />)

    expect(screen.getByText('G-001')).toBeInTheDocument()
    expect(screen.getByText('G-005')).toBeInTheDocument()
  })

  it('shows service type label for each ticket', () => {
    const tickets = [
      makeTicket({ id: '1', queueNumber: 'G-001', serviceType: 'pengaduan' }),
      makeTicket({ id: '2', queueNumber: 'G-002', serviceType: 'p2tl' }),
    ]
    render(<QueueBoard waitingList={tickets} />)

    expect(screen.getAllByText('PENGADUAN').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('P2TL').length).toBeGreaterThanOrEqual(1)
  })

  it('auto-scrolls when more than 5 tickets', () => {
    const tickets = Array.from({ length: 8 }, (_, i) =>
      makeTicket({ id: String(i + 1), queueNumber: `G-${String(i + 1).padStart(3, '0')}` })
    )
    render(<QueueBoard waitingList={tickets} />)

    expect(screen.getByText('G-001')).toBeInTheDocument()
    expect(screen.queryByText('G-008')).not.toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(3000)
    })

    expect(screen.queryByText('G-001')).not.toBeInTheDocument()
    expect(screen.getByText('G-002')).toBeInTheDocument()
  })
})
