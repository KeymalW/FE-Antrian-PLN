import type { ServiceType } from '../types/queue'
import { getQueueList } from '../services/queue'

export interface EstimatedWait {
  estimatedMinutes: number
  queuePosition: number
  totalAhead: number
}

function calculateDurationMinutes(start: string, end: string): number {
  return (new Date(end).getTime() - new Date(start).getTime()) / 60000
}

export async function getEstimatedWaitTime(serviceType: ServiceType): Promise<EstimatedWait> {
  const [allTickets, waitingTickets] = await Promise.all([
    getQueueList(),
    getQueueList({ status: 'waiting' }),
  ])

  const completedTickets = allTickets.filter(
    (t) => t.status === 'completed' && t.serviceType === serviceType && t.calledAt && t.createdAt,
  )

  let avgServiceMinutes = 15

  if (completedTickets.length > 0) {
    const totalDuration = completedTickets.reduce((sum, t) => {
      return sum + calculateDurationMinutes(t.createdAt, t.calledAt!)
    }, 0)
    avgServiceMinutes = Math.round(totalDuration / completedTickets.length)
  }

  const sameServiceWaiting = waitingTickets.filter(
    (t) => t.serviceType === serviceType && t.status === 'waiting',
  )

  const otherServiceWaiting = waitingTickets.filter(
    (t) => t.serviceType !== serviceType && t.status === 'waiting',
  )

  const sameCount = sameServiceWaiting.length
  const otherCount = otherServiceWaiting.length

  const otherWeight = 0.7
  const totalAhead = sameCount + Math.round(otherCount * otherWeight)
  const estimatedMinutes = Math.max(1, Math.round(totalAhead * avgServiceMinutes))

  return {
    estimatedMinutes,
    queuePosition: sameCount + 1,
    totalAhead,
  }
}
