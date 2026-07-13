import { useEffect, useRef, useState } from 'react'
import type { QueueTicket } from '../../types/queue'
import { getServiceLabel } from '../../lib/serviceTypes'

interface QueueBoardProps {
  waitingList: QueueTicket[]
  lastCalled?: QueueTicket | null
}

const VISIBLE_ITEMS = 5

export function QueueBoard({ waitingList }: QueueBoardProps) {
  const [scrollIndex, setScrollIndex] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (waitingList.length <= VISIBLE_ITEMS) return

    intervalRef.current = setInterval(() => {
      setScrollIndex((prev) => {
        const max = Math.max(0, waitingList.length - VISIBLE_ITEMS)
        if (prev > max) return max
        return prev >= max ? 0 : prev + 1
      })
    }, 3000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [waitingList.length])

  const clampedIndex = Math.min(
    scrollIndex,
    Math.max(0, waitingList.length - VISIBLE_ITEMS),
  )
  const visible = waitingList.slice(clampedIndex, clampedIndex + VISIBLE_ITEMS)

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-pln-cyan/70">
        <div className="size-1.5 rounded-full bg-pln-cyan" />
        Antrian Menunggu ({waitingList.length})
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="space-y-1.5">
          {visible.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-gray-500">
              Tidak ada antrian
            </div>
          ) : (
            visible.map((q, i) => (
              <div
                key={q.id}
                className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                  i === 0 && scrollIndex === 0
                    ? 'bg-pln-cyan/10 ring-1 ring-pln-cyan'
                    : 'bg-gray-800/40 ring-1 ring-pln-cyan/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`text-base font-bold ${
                      i === 0 && scrollIndex === 0
                        ? 'text-pln-cyan'
                        : 'text-white'
                    }`}
                  >
                    {q.queueNumber}
                  </span>
                  <span
                    className={`text-xs ${
                      i === 0 && scrollIndex === 0
                        ? 'text-pln-cyan/90'
                        : 'text-gray-300'
                    }`}
                  >
                    {getServiceLabel(q.serviceType).toUpperCase()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
