import type { LoginResponse, User } from '../types/auth'
import type { CallRequest, QueueStats, QueueTicket, ServiceType } from '../types/queue'

type TicketSeed = Omit<QueueTicket, 'createdAt' | 'calledAt' | 'completedAt'> & {
  createdMinutesAgo: number
  calledMinutesAgo?: number | null
  completedMinutesAgo?: number | null
}

const servicePrefix: Record<ServiceType, string> = {
  pembayaran: 'P',
  pengaduan: 'G',
  pendaftaran: 'D',
  informasi: 'I',
}

const mockUsers: Record<string, { user: User; password: string; token: string }> = {
  admin: {
    password: 'admin123',
    token: 'mock-admin-token',
    user: {
      id: 'user-admin',
      username: 'admin',
      name: 'Admin PLN',
      role: 'admin',
      counterNumber: null,
    },
  },
  petugas1: {
    password: 'petugas123',
    token: 'mock-petugas-token',
    user: {
      id: 'user-petugas-1',
      username: 'petugas1',
      name: 'Petugas Loket 1',
      role: 'petugas',
      counterNumber: 1,
    },
  },
}

function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString()
}

function createTicket(seed: TicketSeed): QueueTicket {
  return {
    id: seed.id,
    queueNumber: seed.queueNumber,
    serviceType: seed.serviceType,
    status: seed.status,
    counterNumber: seed.counterNumber,
    createdAt: minutesAgo(seed.createdMinutesAgo),
    calledAt: seed.calledMinutesAgo == null ? null : minutesAgo(seed.calledMinutesAgo),
    completedAt: seed.completedMinutesAgo == null ? null : minutesAgo(seed.completedMinutesAgo),
  }
}

const mockTickets: QueueTicket[] = [
  createTicket({
    id: 'ticket-1',
    queueNumber: 'P-001',
    serviceType: 'pembayaran',
    status: 'waiting',
    counterNumber: null,
    createdMinutesAgo: 45,
  }),
  createTicket({
    id: 'ticket-2',
    queueNumber: 'G-001',
    serviceType: 'pengaduan',
    status: 'waiting',
    counterNumber: null,
    createdMinutesAgo: 38,
  }),
  createTicket({
    id: 'ticket-3',
    queueNumber: 'D-001',
    serviceType: 'pendaftaran',
    status: 'waiting',
    counterNumber: null,
    createdMinutesAgo: 31,
  }),
  createTicket({
    id: 'ticket-4',
    queueNumber: 'I-001',
    serviceType: 'informasi',
    status: 'waiting',
    counterNumber: null,
    createdMinutesAgo: 24,
  }),
  createTicket({
    id: 'ticket-5',
    queueNumber: 'P-002',
    serviceType: 'pembayaran',
    status: 'called',
    counterNumber: 1,
    createdMinutesAgo: 22,
    calledMinutesAgo: 12,
  }),
  createTicket({
    id: 'ticket-6',
    queueNumber: 'G-002',
    serviceType: 'pengaduan',
    status: 'serving',
    counterNumber: 2,
    createdMinutesAgo: 29,
    calledMinutesAgo: 18,
  }),
  createTicket({
    id: 'ticket-7',
    queueNumber: 'D-002',
    serviceType: 'pendaftaran',
    status: 'completed',
    counterNumber: 3,
    createdMinutesAgo: 60,
    calledMinutesAgo: 55,
    completedMinutesAgo: 40,
  }),
  createTicket({
    id: 'ticket-8',
    queueNumber: 'I-002',
    serviceType: 'informasi',
    status: 'skipped',
    counterNumber: null,
    createdMinutesAgo: 52,
    calledMinutesAgo: 47,
  }),
]

const mockState = {
  tickets: [...mockTickets],
  nextSequence: {
    pembayaran: 3,
    pengaduan: 3,
    pendaftaran: 3,
    informasi: 3,
  } satisfies Record<ServiceType, number>,
}

function clone(ticket: QueueTicket): QueueTicket {
  return { ...ticket }
}

function getSortedTickets(tickets: QueueTicket[]): QueueTicket[] {
  return [...tickets].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

function getNextQueueNumber(serviceType: ServiceType): string {
  const next = mockState.nextSequence[serviceType]
  mockState.nextSequence[serviceType] += 1
  return `${servicePrefix[serviceType]}-${String(next).padStart(3, '0')}`
}

function updateTicket(id: string, updater: (ticket: QueueTicket) => QueueTicket): QueueTicket {
  const index = mockState.tickets.findIndex((ticket) => ticket.id === id)
  if (index < 0) {
    throw new Error('Ticket not found')
  }

  const next = updater(mockState.tickets[index])
  mockState.tickets[index] = next
  return clone(next)
}

function getActiveTicket(counterNumber: number): QueueTicket | null {
  const active = mockState.tickets
    .filter((ticket) =>
      ticket.counterNumber === counterNumber &&
      (ticket.status === 'called' || ticket.status === 'serving'),
    )
    .sort((a, b) => {
      const aTime = a.calledAt ?? a.createdAt
      const bTime = b.calledAt ?? b.createdAt
      return bTime.localeCompare(aTime)
    })[0]

  return active ? clone(active) : null
}

export function mockLogin(username: string, password: string): LoginResponse {
  const account = mockUsers[username]

  if (!account || account.password !== password) {
    throw new Error('Invalid credentials')
  }

  localStorage.setItem('token', account.token)
  localStorage.setItem('user', JSON.stringify(account.user))

  return {
    user: { ...account.user },
    token: account.token,
  }
}

export function mockLogout(): void {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
}

export function mockGetProfile(): User {
  const raw = localStorage.getItem('user')
  if (raw) {
    return JSON.parse(raw) as User
  }

  return { ...mockUsers.admin.user }
}

export function mockGetQueueList(params?: {
  status?: string
  serviceType?: string
  page?: number
  perPage?: number
}): QueueTicket[] {
  const filtered = getSortedTickets(mockState.tickets.filter((ticket) => {
    if (params?.status && ticket.status !== params.status) return false
    if (params?.serviceType && ticket.serviceType !== params.serviceType) return false
    return true
  }))

  const page = params?.page ?? 1
  const perPage = params?.perPage ?? filtered.length
  const start = Math.max(0, (page - 1) * perPage)
  const end = start + perPage

  return filtered.slice(start, end).map(clone)
}

export function mockTakeTicket(serviceType: ServiceType): QueueTicket {
  const ticket: QueueTicket = {
    id: `ticket-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    queueNumber: getNextQueueNumber(serviceType),
    serviceType,
    status: 'waiting',
    counterNumber: null,
    createdAt: new Date().toISOString(),
    calledAt: null,
    completedAt: null,
  }

  mockState.tickets.push(ticket)
  return clone(ticket)
}

export function mockCallQueue(payload: CallRequest): QueueTicket {
  return updateTicket(payload.queueId, (ticket) => ({
    ...ticket,
    status: 'called',
    counterNumber: payload.counterNumber,
    calledAt: new Date().toISOString(),
    completedAt: null,
  }))
}

export function mockSkipQueue(queueId: string): QueueTicket {
  return updateTicket(queueId, (ticket) => ({
    ...ticket,
    status: 'skipped',
    counterNumber: null,
    completedAt: null,
  }))
}

export function mockCompleteQueue(queueId: string): QueueTicket {
  return updateTicket(queueId, (ticket) => ({
    ...ticket,
    status: 'completed',
    completedAt: new Date().toISOString(),
  }))
}

export function mockGetQueueStats(): QueueStats {
  const totals = mockState.tickets.reduce(
    (acc, ticket) => {
      acc.total += 1
      acc[ticket.status] += 1
      return acc
    },
    {
      total: 0,
      waiting: 0,
      called: 0,
      serving: 0,
      completed: 0,
      skipped: 0,
    } satisfies QueueStats,
  )

  return totals
}

export function mockGetLastCalled(counterNumber: number): QueueTicket | null {
  return getActiveTicket(counterNumber)
}
