import { create } from 'zustand'
import type { QueueTicket, QueueStats } from '../types/queue'

interface QueueState {
  queueList: QueueTicket[]
  stats: QueueStats | null
  counterStatus: Record<number, boolean>
  setQueueList: (list: QueueTicket[]) => void
  setStats: (stats: QueueStats | null) => void
  addTicket: (ticket: QueueTicket) => void
  updateTicket: (id: string, updates: Partial<QueueTicket>) => void
  setCounterStatus: (counter: number, paused: boolean) => void
}

export const useQueueStore = create<QueueState>((set) => ({
  queueList: [],
  stats: null,
  counterStatus: {},

  setQueueList: (list) => set({ queueList: list }),

  setStats: (stats) => set({ stats }),

  addTicket: (ticket) =>
    set((state) => ({ queueList: [...state.queueList, ticket] })),

  updateTicket: (id, updates) =>
    set((state) => ({
      queueList: state.queueList.map((t) =>
        t.id === id ? { ...t, ...updates } : t,
      ),
    })),

  setCounterStatus: (counter, paused) =>
    set((state) => ({
      counterStatus: { ...state.counterStatus, [counter]: paused },
    })),
}))
