import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Kiosk from '../Kiosk'
import type { QueueTicket } from '../../types/queue'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('../../services/queue', () => ({
  takeTicket: vi.fn().mockResolvedValue({ id: 'ticket-123', queueNumber: 'G-001' }),
}))

vi.mock('../../lib/estimatedWaitTime', () => ({
  getEstimatedWaitTime: vi.fn().mockResolvedValue({ estimatedMinutes: 15, waitingCount: 3 }),
}))

function renderKiosk() {
  return render(
    <MemoryRouter>
      <Kiosk />
    </MemoryRouter>
  )
}

describe('Kiosk', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders welcome heading', async () => {
    renderKiosk()
    await waitFor(() => {
      expect(screen.getByText('Selamat Datang di')).toBeInTheDocument()
    })
    expect(screen.getByText('ULP Subang')).toBeInTheDocument()
    expect(screen.getByText('Silakan pilih layanan yang Anda butuhkan')).toBeInTheDocument()
  })

  it('renders all 3 service buttons', async () => {
    renderKiosk()
    await waitFor(() => {
      expect(screen.getByText('PENGADUAN')).toBeInTheDocument()
    })
    expect(screen.getByText('PB/PD/migrasi')).toBeInTheDocument()
    expect(screen.getByText('P2TL')).toBeInTheDocument()
  })

  it('renders queue status badge on each card', async () => {
    renderKiosk()
    await waitFor(() => {
      expect(screen.getByText('PENGADUAN')).toBeInTheDocument()
    })
    const badges = screen.getAllByText('Belum Ada Antrian')
    expect(badges).toHaveLength(3)
  })

  it('shows loading state then navigates after taking ticket', async () => {
    const user = userEvent.setup()
    renderKiosk()

    await waitFor(() => {
      expect(screen.getByText('PENGADUAN')).toBeInTheDocument()
    })

    const pengaduanBtn = screen.getByText('PENGADUAN').closest('button')!
    await user.click(pengaduanBtn)

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/track/ticket-123')
    })
  })

  it('shows error message on failure', async () => {
    const { takeTicket } = await import('../../services/queue')
    vi.mocked(takeTicket).mockRejectedValueOnce({ userMessage: 'Antrian penuh' })

    const user = userEvent.setup()
    renderKiosk()

    await waitFor(() => {
      expect(screen.getByText('PENGADUAN')).toBeInTheDocument()
    })

    const pengaduanBtn = screen.getByText('PENGADUAN').closest('button')!
    await user.click(pengaduanBtn)

    await waitFor(() => {
      expect(screen.getByText('Antrian penuh')).toBeInTheDocument()
    })
  })

  it('disables buttons while loading', async () => {
    const { takeTicket } = await import('../../services/queue')
    let resolveTicket!: (value: QueueTicket) => void
    vi.mocked(takeTicket).mockImplementationOnce(
      () => new Promise((resolve) => { resolveTicket = resolve })
    )

    const user = userEvent.setup()
    renderKiosk()

    await waitFor(() => {
      expect(screen.getByText('PENGADUAN')).toBeInTheDocument()
    })

    const pengaduanBtn = screen.getByText('PENGADUAN').closest('button')!
    user.click(pengaduanBtn)

    await waitFor(() => {
      expect(pengaduanBtn).toBeDisabled()
    })

    resolveTicket({
      id: 'ticket-123',
      queueNumber: 'G-001',
      serviceType: 'pengaduan',
      status: 'waiting',
      counterNumber: 1,
      createdAt: new Date().toISOString(),
      calledAt: null,
      completedAt: null,
    })

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/track/ticket-123')
    })
  })
})
