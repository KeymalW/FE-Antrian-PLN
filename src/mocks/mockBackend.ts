import type { LoginResponse, User } from '../types/auth'
import type { CallRequest, QueueStats, QueueStatus, QueueTicket, ServiceType } from '../types/queue'

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

function startOfCurrentWeekMonday() {
  const result = new Date()
  result.setHours(0, 0, 0, 0)
  const day = result.getDay()
  const diff = day === 0 ? -6 : 1 - day
  result.setDate(result.getDate() + diff)
  return result
}

function weekTimestamp(dayOffset: number, hour: number, minute: number) {
  const date = startOfCurrentWeekMonday()
  date.setDate(date.getDate() + dayOffset)
  date.setHours(hour, minute, 0, 0)
  return date.toISOString()
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

function createWeeklyTicket(seed: {
  id: string
  queueNumber: string
  serviceType: ServiceType
  status: QueueStatus
  counterNumber: 1 | 2 | 3
  dayOffset: number
  createdHour: number
  createdMinute: number
  calledHour?: number
  calledMinute?: number
  completedHour?: number
  completedMinute?: number
}): QueueTicket {
  return {
    id: seed.id,
    queueNumber: seed.queueNumber,
    serviceType: seed.serviceType,
    status: seed.status,
    counterNumber: seed.counterNumber,
    createdAt: weekTimestamp(seed.dayOffset, seed.createdHour, seed.createdMinute),
    calledAt:
      seed.calledHour == null || seed.calledMinute == null
        ? null
        : weekTimestamp(seed.dayOffset, seed.calledHour, seed.calledMinute),
    completedAt:
      seed.completedHour == null || seed.completedMinute == null
        ? null
        : weekTimestamp(seed.dayOffset, seed.completedHour, seed.completedMinute),
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
  createWeeklyTicket({
    id: 'week-1',
    queueNumber: 'P-101',
    serviceType: 'pembayaran',
    status: 'completed',
    counterNumber: 1,
    dayOffset: 0,
    createdHour: 8,
    createdMinute: 10,
    calledHour: 8,
    calledMinute: 18,
    completedHour: 8,
    completedMinute: 40,
  }),
  createWeeklyTicket({
    id: 'week-2',
    queueNumber: 'G-101',
    serviceType: 'pengaduan',
    status: 'completed',
    counterNumber: 2,
    dayOffset: 0,
    createdHour: 9,
    createdMinute: 15,
    calledHour: 9,
    calledMinute: 25,
    completedHour: 9,
    completedMinute: 52,
  }),
  createWeeklyTicket({
    id: 'week-3',
    queueNumber: 'D-101',
    serviceType: 'pendaftaran',
    status: 'serving',
    counterNumber: 3,
    dayOffset: 0,
    createdHour: 10,
    createdMinute: 5,
    calledHour: 10,
    calledMinute: 20,
  }),
  createWeeklyTicket({
    id: 'week-4',
    queueNumber: 'P-102',
    serviceType: 'pembayaran',
    status: 'completed',
    counterNumber: 1,
    dayOffset: 1,
    createdHour: 8,
    createdMinute: 10,
    calledHour: 8,
    calledMinute: 22,
    completedHour: 8,
    completedMinute: 48,
  }),
  createWeeklyTicket({
    id: 'week-5',
    queueNumber: 'G-102',
    serviceType: 'pengaduan',
    status: 'called',
    counterNumber: 2,
    dayOffset: 1,
    createdHour: 9,
    createdMinute: 12,
    calledHour: 9,
    calledMinute: 31,
  }),
  createWeeklyTicket({
    id: 'week-6',
    queueNumber: 'I-101',
    serviceType: 'informasi',
    status: 'completed',
    counterNumber: 3,
    dayOffset: 1,
    createdHour: 10,
    createdMinute: 8,
    calledHour: 10,
    calledMinute: 16,
    completedHour: 10,
    completedMinute: 44,
  }),
  createWeeklyTicket({
    id: 'week-7',
    queueNumber: 'D-102',
    serviceType: 'pendaftaran',
    status: 'completed',
    counterNumber: 1,
    dayOffset: 2,
    createdHour: 8,
    createdMinute: 5,
    calledHour: 8,
    calledMinute: 12,
    completedHour: 8,
    completedMinute: 33,
  }),
  createWeeklyTicket({
    id: 'week-8',
    queueNumber: 'P-103',
    serviceType: 'pembayaran',
    status: 'serving',
    counterNumber: 2,
    dayOffset: 2,
    createdHour: 9,
    createdMinute: 18,
    calledHour: 9,
    calledMinute: 40,
  }),
  createWeeklyTicket({
    id: 'week-9',
    queueNumber: 'G-103',
    serviceType: 'pengaduan',
    status: 'completed',
    counterNumber: 3,
    dayOffset: 2,
    createdHour: 10,
    createdMinute: 22,
    calledHour: 10,
    calledMinute: 33,
    completedHour: 11,
    completedMinute: 2,
  }),
  createWeeklyTicket({
    id: 'week-10',
    queueNumber: 'P-104',
    serviceType: 'pembayaran',
    status: 'completed',
    counterNumber: 1,
    dayOffset: 3,
    createdHour: 8,
    createdMinute: 6,
    calledHour: 8,
    calledMinute: 19,
    completedHour: 8,
    completedMinute: 46,
  }),
  createWeeklyTicket({
    id: 'week-11',
    queueNumber: 'D-103',
    serviceType: 'pendaftaran',
    status: 'called',
    counterNumber: 2,
    dayOffset: 3,
    createdHour: 9,
    createdMinute: 14,
    calledHour: 9,
    calledMinute: 35,
  }),
  createWeeklyTicket({
    id: 'week-12',
    queueNumber: 'I-102',
    serviceType: 'informasi',
    status: 'completed',
    counterNumber: 3,
    dayOffset: 3,
    createdHour: 10,
    createdMinute: 4,
    calledHour: 10,
    calledMinute: 17,
    completedHour: 10,
    completedMinute: 55,
  }),
  createWeeklyTicket({
    id: 'week-13',
    queueNumber: 'G-104',
    serviceType: 'pengaduan',
    status: 'completed',
    counterNumber: 1,
    dayOffset: 4,
    createdHour: 8,
    createdMinute: 3,
    calledHour: 8,
    calledMinute: 25,
    completedHour: 8,
    completedMinute: 51,
  }),
  createWeeklyTicket({
    id: 'week-14',
    queueNumber: 'P-105',
    serviceType: 'pembayaran',
    status: 'serving',
    counterNumber: 2,
    dayOffset: 4,
    createdHour: 9,
    createdMinute: 11,
    calledHour: 9,
    calledMinute: 29,
  }),
  createWeeklyTicket({
    id: 'week-15',
    queueNumber: 'D-104',
    serviceType: 'pendaftaran',
    status: 'completed',
    counterNumber: 3,
    dayOffset: 4,
    createdHour: 10,
    createdMinute: 7,
    calledHour: 10,
    calledMinute: 21,
    completedHour: 10,
    completedMinute: 49,
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

export function mockClearQueueHistory(): void {
  mockState.tickets = mockState.tickets.filter(
    (t) => t.status !== 'completed' && t.status !== 'skipped',
  )
}
