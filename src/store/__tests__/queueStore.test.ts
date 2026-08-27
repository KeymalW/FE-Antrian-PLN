import { describe, it, expect, beforeEach } from 'vitest'
import { useQueueStore } from '../../store/queueStore'
import type { QueueTicket, QueueStats } from '../../types/queue'

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

describe('queueStore', () => {
  beforeEach(() => {
    useQueueStore.setState({
      queueList: [],
      stats: null,
      counterStatus: {},
    })
  })

  describe('setQueueList', () => {
    it('sets the queue list', () => {
      const tickets = [makeTicket({ id: '1' }), makeTicket({ id: '2' })]
      useQueueStore.getState().setQueueList(tickets)
      expect(useQueueStore.getState().queueList).toHaveLength(2)
    })
  })

  describe('addTicket', () => {
    it('appends ticket to list', () => {
      useQueueStore.getState().setQueueList([makeTicket({ id: '1' })])
      useQueueStore.getState().addTicket(makeTicket({ id: '2' }))
      expect(useQueueStore.getState().queueList).toHaveLength(2)
      expect(useQueueStore.getState().queueList[1].id).toBe('2')
    })
  })

  describe('updateTicket', () => {
    it('updates ticket in queueList by id', () => {
      useQueueStore.getState().setQueueList([
        makeTicket({ id: '1', status: 'waiting' }),
        makeTicket({ id: '2', status: 'waiting' }),
      ])
      useQueueStore.getState().updateTicket('1', { status: 'called' })

      const list = useQueueStore.getState().queueList
      expect(list[0].status).toBe('called')
      expect(list[1].status).toBe('waiting')
    })
  })

  describe('setStats', () => {
    it('sets stats', () => {
      const stats: QueueStats = { total: 10, waiting: 5, called: 2, serving: 1, completed: 1, skipped: 1 }
      useQueueStore.getState().setStats(stats)
      expect(useQueueStore.getState().stats?.total).toBe(10)
    })
  })

  describe('setCounterStatus', () => {
    it('sets counter paused status', () => {
      useQueueStore.getState().setCounterStatus(1, true)
      expect(useQueueStore.getState().counterStatus[1]).toBe(true)
    })

    it('can pause and unpause', () => {
      useQueueStore.getState().setCounterStatus(2, true)
      useQueueStore.getState().setCounterStatus(2, false)
      expect(useQueueStore.getState().counterStatus[2]).toBe(false)
    })
  })
})
