import type { LoginResponse, User } from '../types/auth'
import type { CallRequest, QueueStats, QueueStatus, QueueTicket, ServiceType } from '../types/queue'
import type {
  CreateAccountInput,
  GeneralSettings,
  KioskTextSettings,
  ServiceDefinition,
  TicketTextSettings,
  UpdateAccountInput,
} from '../types/admin'

type TicketSeed = Omit<QueueTicket, 'createdAt' | 'calledAt' | 'completedAt'> & {
  createdMinutesAgo: number
  calledMinutesAgo?: number | null
  completedMinutesAgo?: number | null
}

const servicePrefix: Record<ServiceType, string> = {
  pengaduan: 'G',
  pb_pd_migrasi: 'M',
  p2tl: 'T',
}

const mockUsers: Record<string, { user: User; password: string; token: string }> = {
  adminulpsubang: {
    password: 'adminulpsubang',
    token: 'mock-admin-token',
    user: {
      id: 'user-admin',
      username: 'adminulpsubang',
      name: 'Admin ULP Subang',
      role: 'admin',
      counterNumber: null,
    },
  },
  petugasulpsubang: {
    password: 'petugasulpsubang',
    token: 'mock-petugas-token',
    user: {
      id: 'user-petugas-1',
      username: 'petugasulpsubang',
      name: 'Petugas ULP Subang',
      role: 'petugas',
      counterNumber: 1,
    },
  },
  kioskulpsubang: {
    password: 'kioskulpsubang',
    token: 'mock-kiosk-token',
    user: {
      id: 'user-kiosk',
      username: 'kioskulpsubang',
      name: 'Kiosk ULP Subang',
      role: 'kiosk',
      counterNumber: null,
    },
  },
  tvulpsubang: {
    password: 'tvulpsubang',
    token: 'mock-tv-token',
    user: {
      id: 'user-tv',
      username: 'tvulpsubang',
      name: 'TV Display ULP Subang',
      role: 'tvdisplay',
      counterNumber: null,
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
    queueNumber: 'G-001',
    serviceType: 'pengaduan',
    status: 'waiting',
    counterNumber: null,
    createdMinutesAgo: 45,
  }),
  createTicket({
    id: 'ticket-2',
    queueNumber: 'G-002',
    serviceType: 'pengaduan',
    status: 'waiting',
    counterNumber: null,
    createdMinutesAgo: 38,
  }),
  createTicket({
    id: 'ticket-3',
    queueNumber: 'M-001',
    serviceType: 'pb_pd_migrasi',
    status: 'waiting',
    counterNumber: null,
    createdMinutesAgo: 31,
  }),
  createTicket({
    id: 'ticket-4',
    queueNumber: 'T-001',
    serviceType: 'p2tl',
    status: 'waiting',
    counterNumber: null,
    createdMinutesAgo: 24,
  }),
  createTicket({
    id: 'ticket-5',
    queueNumber: 'G-003',
    serviceType: 'pengaduan',
    status: 'called',
    counterNumber: 1,
    createdMinutesAgo: 22,
    calledMinutesAgo: 12,
  }),
  createTicket({
    id: 'ticket-6',
    queueNumber: 'G-004',
    serviceType: 'pengaduan',
    status: 'serving',
    counterNumber: 2,
    createdMinutesAgo: 29,
    calledMinutesAgo: 18,
  }),
  createTicket({
    id: 'ticket-7',
    queueNumber: 'M-002',
    serviceType: 'pb_pd_migrasi',
    status: 'completed',
    counterNumber: 3,
    createdMinutesAgo: 60,
    calledMinutesAgo: 55,
    completedMinutesAgo: 40,
  }),
  createTicket({
    id: 'ticket-8',
    queueNumber: 'T-002',
    serviceType: 'p2tl',
    status: 'skipped',
    counterNumber: null,
    createdMinutesAgo: 52,
    calledMinutesAgo: 47,
  }),
  createWeeklyTicket({
    id: 'week-1',
    queueNumber: 'G-101',
    serviceType: 'pengaduan',
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
    queueNumber: 'M-101',
    serviceType: 'pb_pd_migrasi',
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
    queueNumber: 'T-101',
    serviceType: 'p2tl',
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
    queueNumber: 'G-102',
    serviceType: 'pengaduan',
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
    queueNumber: 'M-102',
    serviceType: 'pb_pd_migrasi',
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
    queueNumber: 'T-102',
    serviceType: 'p2tl',
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
    queueNumber: 'G-103',
    serviceType: 'pengaduan',
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
    queueNumber: 'M-103',
    serviceType: 'pb_pd_migrasi',
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
    queueNumber: 'T-103',
    serviceType: 'p2tl',
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
    queueNumber: 'G-104',
    serviceType: 'pengaduan',
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
    queueNumber: 'M-104',
    serviceType: 'pb_pd_migrasi',
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
    queueNumber: 'T-104',
    serviceType: 'p2tl',
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
    queueNumber: 'G-105',
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
    queueNumber: 'M-105',
    serviceType: 'pb_pd_migrasi',
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
    queueNumber: 'T-105',
    serviceType: 'p2tl',
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

function getInitialState() {
  const accountEntries: Array<{ user: User; password: string }> = Object.values(mockUsers)
    .map(({ user, password }) => ({ user: { ...user }, password }))

  return {
    tickets: [...mockTickets],
    nextSequence: {
      pengaduan: 5,
      pb_pd_migrasi: 3,
      p2tl: 3,
    } satisfies Record<ServiceType, number>,
    accounts: accountEntries,
    serviceCatalog: [
      { id: 'svc-pengaduan', name: 'Pengaduan', code: 'pengaduan', prefix: 'G', counterNumber: 1, icon: 'megaphone', serviceGroup: 'group_a', isActive: true, showInKiosk: true },
      { id: 'svc-pbpd', name: 'PB/PD/Migrasi', code: 'pb_pd_migrasi', prefix: 'M', counterNumber: 2, icon: 'plug-zap', serviceGroup: 'group_a', isActive: true, showInKiosk: true },
      { id: 'svc-p2tl', name: 'P2TL', code: 'p2tl', prefix: 'T', counterNumber: 3, icon: 'wrench', serviceGroup: 'group_b', isActive: true, showInKiosk: true },
    ] satisfies ServiceDefinition[],
    generalSettings: {
      institutionName: 'PLN ULP Subang',
      logoUrl: '/assets/logo-pln.png',
    } satisfies GeneralSettings,
    ticketText: {
      headerText: 'NOMOR ANTRIAN',
      subHeaderText: 'Nomor antrian Anda',
      footerMessage: 'Terima kasih telah mengambil tiket. Silakan menunggu pemanggilan.',
    } satisfies TicketTextSettings,
    kioskText: {
      welcomeText: 'Selamat Datang di',
      subtitleText: 'Silakan pilih layanan yang Anda butuhkan',
      hintText: 'Sentuh layar untuk mencetak tiket',
      footerText: 'PT PLN (Persero) · ULP Subang',
    } satisfies KioskTextSettings,
    videoLinks: [] as Array<{ id: string; url: string; title: string }>,
    videoVolume: 0.2,
  }
}

function persistState(state: typeof mockState) {
  try {
    sessionStorage.setItem('mockQueueState', JSON.stringify(state))
  } catch {
    /* noop */
  }
}

function loadState() {
  try {
    const saved = sessionStorage.getItem('mockQueueState')
    if (saved) return JSON.parse(saved) as ReturnType<typeof getInitialState>
  } catch {
    /* noop */
  }
  return getInitialState()
}

/* Session lama mungkin belum punya field baru — isi dengan default. */
function ensureShape<T extends ReturnType<typeof getInitialState>>(state: T): T {
  const initial = getInitialState()
  if (!Array.isArray(state.accounts)) state.accounts = initial.accounts
  if (!Array.isArray(state.serviceCatalog)) state.serviceCatalog = initial.serviceCatalog
  // Sesi lama: isi field baru untuk baris yang belum memilikinya.
  state.serviceCatalog = (state.serviceCatalog as Array<Record<string, unknown>>).map((row) => {
    const legacy = initial.serviceCatalog.find((s) => s.prefix === row.prefix)
    return {
      ...row,
      code: (row.code as string | undefined) ?? (legacy?.code ?? String(row.name ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '_')),
      counterNumber: (row.counterNumber as number | null | undefined) ?? (legacy?.counterNumber ?? null),
      icon: (row.icon as string | null | undefined) ?? null,
      serviceGroup: (row.serviceGroup as string | undefined) ?? (legacy?.serviceGroup ?? 'group_a'),
    }
  })
  if (!state.generalSettings) state.generalSettings = initial.generalSettings
  if (!state.ticketText) state.ticketText = initial.ticketText
  if (!state.kioskText) state.kioskText = initial.kioskText
  if (!Array.isArray(state.videoLinks)) state.videoLinks = []
  if (typeof state.videoVolume !== 'number') state.videoVolume = initial.videoVolume
  return state
}

const mockState = ensureShape(loadState())

/* Video hasil upload disimpan in-memory saja (object URL hilang saat reload). */
const uploadedVideos: Array<{ id: string; filename: string; url: string }> = []

function saveState() {
  persistState(mockState)
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
  saveState()
  return `${servicePrefix[serviceType]}-${String(next).padStart(3, '0')}`
}

function updateTicket(id: string, updater: (ticket: QueueTicket) => QueueTicket): QueueTicket {
  const index = mockState.tickets.findIndex((ticket) => ticket.id === id)
  if (index < 0) {
    throw new Error('Ticket not found')
  }

  const next = updater(mockState.tickets[index])
  mockState.tickets[index] = next
  saveState()
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
  const account = mockState.accounts.find((entry) => entry.user.username === username)

  if (!account || account.password !== password) {
    throw new Error('Invalid credentials')
  }

  localStorage.setItem('token', `mock-${account.user.id}-token`)
  localStorage.setItem('user', JSON.stringify(account.user))

  return {
    user: { ...account.user },
    token: `mock-${account.user.id}-token`,
  }
}

export function mockAdminExists(): boolean {
  return mockState.accounts.some((entry) => entry.user.role === 'admin')
}

export function mockRegister(payload: {
  name: string
  username: string
  password: string
  password_confirmation: string
}): LoginResponse {
  if (mockAdminExists()) {
    throw new Error('Admin sudah ada. Silakan login atau hubungi admin untuk membuat akun baru.')
  }

  const name = payload.name.trim()
  const username = payload.username.trim().toLowerCase()
  const password = payload.password

  if (!name || !username || !password) throw new Error('Nama, username, dan password wajib diisi')
  if (username.length < 3) throw new Error('Username minimal 3 karakter')
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) throw new Error('Username hanya boleh huruf, angka, dash, underscore')
  if (password.length < 6) throw new Error('Password minimal 6 karakter')
  if (password !== payload.password_confirmation) throw new Error('Konfirmasi password tidak cocok')
  if (mockState.accounts.some((entry) => entry.user.username === username)) {
    throw new Error('Username sudah digunakan')
  }

  const user: User = {
    id: `user-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    username,
    name,
    role: 'admin',
    counterNumber: null,
  }
  mockState.accounts.push({ user, password })
  saveState()

  const token = `mock-${user.id}-token`
  localStorage.setItem('token', token)
  localStorage.setItem('user', JSON.stringify(user))

  return { user: { ...user }, token }
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
  from?: string
  to?: string
}): QueueTicket[] {
  const fromTime = params?.from ? new Date(`${params.from}T00:00:00`).getTime() : null
  const toTime = params?.to ? new Date(`${params.to}T23:59:59.999`).getTime() : null

  const filtered = getSortedTickets(mockState.tickets.filter((ticket) => {
    if (params?.status && ticket.status !== params.status) return false
    if (params?.serviceType && ticket.serviceType !== params.serviceType) return false
    if (fromTime != null) {
      const created = new Date(ticket.createdAt).getTime()
      if (Number.isNaN(created) || created < fromTime) return false
    }
    if (toTime != null) {
      const created = new Date(ticket.createdAt).getTime()
      if (Number.isNaN(created) || created > toTime) return false
    }
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
  saveState()
  return clone(ticket)
}

export function mockCallQueue(payload: CallRequest): QueueTicket {
  const ticket = mockState.tickets.find((t) => t.id === payload.queueId)
  if (!ticket) throw new Error('Ticket not found')

  // Model jalur per layanan — paritas dengan backend:
  // hanya layanan yang SAMA yang diblokir di satu loket.
  const serviceName =
    mockState.serviceCatalog.find((s) => s.code === ticket.serviceType)?.name ??
    ticket.serviceType

  const activeDuplicate = mockState.tickets.find(
    (t) =>
      t.id !== payload.queueId &&
      (t.status === 'called' || t.status === 'serving') &&
      t.counterNumber === payload.counterNumber &&
      t.serviceType === payload.serviceType,
  )
  if (activeDuplicate) {
    throw new Error(
      `Masih ada antrian aktif ${serviceName} (${activeDuplicate.queueNumber}) di Loket ${payload.counterNumber}. Selesaikan atau lewati terlebih dahulu.`,
    )
  }

  return updateTicket(payload.queueId, (t) => ({
    ...t,
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

export function mockRecallQueue(queueId: string): QueueTicket {
  const ticket = mockState.tickets.find((t) => t.id === queueId)
  if (!ticket) throw new Error('Tiket tidak ditemukan')
  if (ticket.status !== 'called' && ticket.status !== 'serving') {
    throw new Error('Hanya antrian aktif yang bisa dipanggil ulang')
  }
  return clone(ticket)
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

export function mockGetTicketById(id: string): QueueTicket | null {
  const ticket = mockState.tickets.find((t) => t.id === id)
  return ticket ? clone(ticket) : null
}

export function mockGetLastCalled(counterNumber: number): QueueTicket | null {
  return getActiveTicket(counterNumber)
}

export function mockClearQueueHistory(): void {
  mockState.tickets = mockState.tickets.filter(
    (t) => t.status !== 'completed' && t.status !== 'skipped',
  )
  saveState()
}

export function mockGetTrashedTickets(): QueueTicket[] {
  return getSortedTickets(mockState.tickets.filter(
    (t) => t.status === 'completed' || t.status === 'skipped',
  )).map(clone)
}

export function mockRestoreTicket(ticketId: string): QueueTicket {
  return updateTicket(ticketId, (ticket) => ({
    ...ticket,
    status: 'waiting',
    counterNumber: null,
    calledAt: null,
    completedAt: null,
  }))
}

export function mockEmptyTrash(): void {
  mockState.tickets = mockState.tickets.filter(
    (t) => t.status !== 'completed' && t.status !== 'skipped',
  )
  saveState()
}

/* ============================== AKUN ============================== */

function cloneAccount(user: User): User {
  return { ...user }
}

export function mockGetAccounts(): User[] {
  return mockState.accounts.map((entry) => cloneAccount(entry.user))
}

export function mockCreateAccount(input: CreateAccountInput): User {
  const username = input.username.trim().toLowerCase()
  if (!username || !input.name.trim() || !input.password) {
    throw new Error('Nama, username, dan password wajib diisi')
  }
  const exists = mockState.accounts.some((entry) => entry.user.username === username)
  if (exists) {
    throw new Error('Username sudah digunakan')
  }

  const user: User = {
    id: `user-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    username,
    name: input.name.trim(),
    role: input.role,
    counterNumber: input.counterNumber,
  }
  mockState.accounts.push({ user, password: input.password })
  saveState()
  return cloneAccount(user)
}

export function mockUpdateAccount(id: string, input: UpdateAccountInput): User {
  const entry = mockState.accounts.find((item) => item.user.id === id)
  if (!entry) throw new Error('Akun tidak ditemukan')

  if (input.username != null) {
    const username = input.username.trim().toLowerCase()
    const taken = mockState.accounts.some(
      (item) => item.user.id !== id && item.user.username === username,
    )
    if (taken) throw new Error('Username sudah digunakan')
    entry.user.username = username
  }
  if (input.name != null) entry.user.name = input.name.trim()
  if (input.role != null) entry.user.role = input.role
  if (input.counterNumber !== undefined) entry.user.counterNumber = input.counterNumber
  if (input.password) entry.password = input.password

  saveState()

  /* Jika akun yang diedit adalah user yang sedang login, perbarui session. */
  try {
    const raw = localStorage.getItem('user')
    if (raw) {
      const current = JSON.parse(raw) as User
      if (current.id === id) {
        localStorage.setItem('user', JSON.stringify({ ...entry.user }))
      }
    }
  } catch {
    /* noop */
  }

  return cloneAccount(entry.user)
}

export function mockDeleteAccount(id: string): void {
  const index = mockState.accounts.findIndex((entry) => entry.user.id === id)
  if (index < 0) throw new Error('Akun tidak ditemukan')

  mockState.accounts.splice(index, 1)
  saveState()
}

/* ============================ LAYANAN ============================= */

function cloneService(service: ServiceDefinition): ServiceDefinition {
  return { ...service }
}

export function mockGetServices(): ServiceDefinition[] {
  return mockState.serviceCatalog.map(cloneService)
}

export function mockCreateService(input: {
  name: string
  code: string
  prefix: string
  counterNumber: number | null
  icon: string | null
  serviceGroup: 'group_a' | 'group_b'
  isActive: boolean
  showInKiosk: boolean
}): ServiceDefinition {
  const name = input.name.trim()
  const prefix = input.prefix.trim().toUpperCase()
  const code = input.code.trim().toLowerCase()
  if (!name || !prefix || !code) throw new Error('Nama, kode, dan prefix layanan wajib diisi')

  const prefixTaken = mockState.serviceCatalog.some(
    (service) => service.prefix.toUpperCase() === prefix,
  )
  if (prefixTaken) throw new Error(`Prefix "${prefix}" sudah digunakan`)

  const codeTaken = mockState.serviceCatalog.some(
    (service) => service.code.toLowerCase() === code,
  )
  if (codeTaken) throw new Error(`Kode "${code}" sudah digunakan`)

  const service: ServiceDefinition = {
    id: `svc-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    name,
    code,
    prefix,
    counterNumber: input.counterNumber,
    icon: input.icon,
    serviceGroup: input.serviceGroup,
    isActive: input.isActive,
    showInKiosk: input.showInKiosk,
  }
  mockState.serviceCatalog.push(service)
  saveState()
  return cloneService(service)
}

export function mockUpdateService(
  id: string,
  input: Partial<Pick<ServiceDefinition, 'name' | 'code' | 'prefix' | 'counterNumber' | 'icon' | 'serviceGroup' | 'isActive' | 'showInKiosk'>>,
): ServiceDefinition {
  const service = mockState.serviceCatalog.find((item) => item.id === id)
  if (!service) throw new Error('Layanan tidak ditemukan')

  if (input.prefix != null) {
    const prefix = input.prefix.trim().toUpperCase()
    const taken = mockState.serviceCatalog.some(
      (item) => item.id !== id && item.prefix.toUpperCase() === prefix,
    )
    if (taken) throw new Error(`Prefix "${prefix}" sudah digunakan`)
    service.prefix = prefix
  }
  if (input.code != null) {
    const code = input.code.trim().toLowerCase()
    const taken = mockState.serviceCatalog.some(
      (item) => item.id !== id && item.code.toLowerCase() === code,
    )
    if (taken) throw new Error(`Kode "${code}" sudah digunakan`)
    service.code = code
  }
  if (input.name != null) service.name = input.name.trim()
  if (input.counterNumber !== undefined) service.counterNumber = input.counterNumber
  if (input.icon !== undefined) service.icon = input.icon
  if (input.serviceGroup != null) service.serviceGroup = input.serviceGroup
  if (input.isActive != null) service.isActive = input.isActive
  if (input.showInKiosk != null) service.showInKiosk = input.showInKiosk

  saveState()
  return cloneService(service)
}

export function mockDeleteService(id: string): void {
  const index = mockState.serviceCatalog.findIndex((service) => service.id === id)
  if (index < 0) throw new Error('Layanan tidak ditemukan')

  mockState.serviceCatalog.splice(index, 1)
  saveState()
}

/* ============================ PENGATURAN ========================== */

export function mockGetGeneralSettings(): GeneralSettings {
  return { ...mockState.generalSettings }
}

export function mockUpdateGeneralSettings(patch: Partial<GeneralSettings>): GeneralSettings {
  mockState.generalSettings = { ...mockState.generalSettings, ...patch }
  saveState()
  return { ...mockState.generalSettings }
}

export function mockGetTicketText(): TicketTextSettings {
  return { ...mockState.ticketText }
}

export function mockUpdateTicketText(patch: Partial<TicketTextSettings>): TicketTextSettings {
  mockState.ticketText = { ...mockState.ticketText, ...patch }
  saveState()
  return { ...mockState.ticketText }
}

/* ============================ TEKS KIOSK ========================== */

export function mockGetKioskText(): KioskTextSettings {
  return { ...mockState.kioskText }
}

export function mockUpdateKioskText(patch: Partial<KioskTextSettings>): KioskTextSettings {
  mockState.kioskText = { ...mockState.kioskText, ...patch }
  saveState()
  return { ...mockState.kioskText }
}

/* =========================== MEDIA TV ============================= */

export function mockAddVideoLink(url: string, title: string): {
  id: string
  url: string
  filename: string
} {
  if (!url.trim()) throw new Error('URL video wajib diisi')

  const link = {
    id: `video-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    url: url.trim(),
    title: title.trim() || url.trim(),
  }
  mockState.videoLinks.push(link)
  saveState()
  return { ...link }
}

export function mockDeleteVideoLink(id: string): void {
  const index = mockState.videoLinks.findIndex((link) => link.id === id)
  if (index >= 0) {
    mockState.videoLinks.splice(index, 1)
    saveState()
  }
}

export function mockGetMonitorVideos(): Array<{ id?: string; url: string; filename: string }> {
  return uploadedVideos.map((video) => ({ id: video.id, url: video.url, filename: video.filename }))
}

export function mockGetVideoLinks(): Array<{ id: string; url: string; filename: string }> {
  return mockState.videoLinks.map((link) => ({ id: link.id, url: link.url, filename: link.title }))
}

export function mockUploadMonitorVideo(file: File): { url: string; filename: string } {
  const entry = {
    id: `upload-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    filename: file.name,
    url: URL.createObjectURL(file),
  }
  uploadedVideos.push(entry)
  return { url: entry.url, filename: entry.filename }
}

export function mockDeleteMonitorVideo(filename: string): void {
  const uploadIndex = uploadedVideos.findIndex((video) => video.filename === filename)
  if (uploadIndex >= 0) {
    uploadedVideos.splice(uploadIndex, 1)
  }
}

export function mockGetVideoVolume(): number {
  return mockState.videoVolume
}

export function mockSetVideoVolume(volume: number): void {
  mockState.videoVolume = volume
  saveState()
}
