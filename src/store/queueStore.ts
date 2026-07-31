import { create } from 'zustand'
import type { QueueTicket, QueueStats, ServiceType } from '../types/queue'
import { getServiceGroup, type ServiceGroup } from '../lib/serviceTypes'

const ALL_GROUPS: ServiceGroup[] = ['group_a', 'group_b']

function initialActiveCalls(): Record<ServiceGroup, QueueTicket | null> {
  return { group_a: null, group_b: null }
}

interface QueueState {
  queueList: QueueTicket[]
  activeCalls: Record<ServiceGroup, QueueTicket | null>
  stats: QueueStats | null
  counterStatus: Record<number, boolean>
  setQueueList: (list: QueueTicket[]) => void
  setActiveCall: (group: ServiceGroup, ticket: QueueTicket | null) => void
  setStats: (stats: QueueStats | null) => void
  addTicket: (ticket: QueueTicket) => void
  updateTicket: (id: string, updates: Partial<QueueTicket>) => void
  setCounterStatus: (counter: number, paused: boolean) => void
}

export const useQueueStore = create<QueueState>((set) => ({
  queueList: [],
  activeCalls: initialActiveCalls(),
  stats: null,
  counterStatus: {},

  setQueueList: (list) => set({ queueList: list }),

  setActiveCall: (group, ticket) =>
    set((state) => ({
      activeCalls: { ...state.activeCalls, [group]: ticket },
    })),

  setStats: (stats) => set({ stats }),

  addTicket: (ticket) =>
    set((state) => ({ queueList: [...state.queueList, ticket] })),

  updateTicket: (id, updates) =>
    set((state) => ({
      queueList: state.queueList.map((t) =>
        t.id === id ? { ...t, ...updates } : t,
      ),
      activeCalls: Object.fromEntries(
        ALL_GROUPS.map((g) => [
          g,
          state.activeCalls[g]?.id === id
            ? { ...state.activeCalls[g]!, ...updates }
            : state.activeCalls[g],
        ]),
      ) as Record<ServiceGroup, QueueTicket | null>,
    })),

  setCounterStatus: (counter, paused) =>
    set((state) => ({
      counterStatus: { ...state.counterStatus, [counter]: paused },
    })),
}))

export function getGroupForServiceType(serviceType: ServiceType): ServiceGroup {
  return getServiceGroup(serviceType)
}

export function hasAnyActiveCall(activeCalls: Record<ServiceGroup, QueueTicket | null>): boolean {
  return ALL_GROUPS.some((g) => activeCalls[g] !== null)
}

export function canCallServiceType(
  activeCalls: Record<ServiceGroup, QueueTicket | null>,
  serviceType: ServiceType,
): boolean {
  const group = getServiceGroup(serviceType)
  return activeCalls[group] === null
}
