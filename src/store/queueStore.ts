import { create } from 'zustand'
import type { QueueTicket, QueueStats } from '../types/queue'

interface QueueState {
  queueList: QueueTicket[]
  lastCalled: QueueTicket | null
  stats: QueueStats | null
  isLoading: boolean
  setQueueList: (list: QueueTicket[]) => void
  setLastCalled: (ticket: QueueTicket | null) => void
  setStats: (stats: QueueStats | null) => void
  setLoading: (loading: boolean) => void
  addTicket: (ticket: QueueTicket) => void
  updateTicket: (id: string, updates: Partial<QueueTicket>) => void
}

export const useQueueStore = create<QueueState>((set) => ({
  queueList: [],
  lastCalled: null,
  stats: null,
  isLoading: false,

  setQueueList: (list) => set({ queueList: list }),
  setLastCalled: (ticket) => set({ lastCalled: ticket }),
  setStats: (stats) => set({ stats }),
  setLoading: (loading) => set({ isLoading: loading }),

  addTicket: (ticket) =>
    set((state) => ({ queueList: [...state.queueList, ticket] })),

  updateTicket: (id, updates) =>
    set((state) => ({
      queueList: state.queueList.map((t) =>
        t.id === id ? { ...t, ...updates } : t,
      ),
    })),
}))
