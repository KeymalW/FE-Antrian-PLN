import { useEffect, useRef, useState } from 'react'
import type { QueueTicket } from '../../types/queue'

interface QueueBoardProps {
  waitingList: QueueTicket[]
  lastCalled: QueueTicket | null
}

const VISIBLE_ITEMS = 8

export function QueueBoard({ waitingList, lastCalled }: QueueBoardProps) {
  const [scrollIndex, setScrollIndex] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (waitingList.length <= VISIBLE_ITEMS) return

    intervalRef.current = setInterval(() => {
      setScrollIndex((prev) => {
        const max = Math.max(0, waitingList.length - VISIBLE_ITEMS)
        return prev >= max ? 0 : prev + 1
      })
    }, 3000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [waitingList.length])

  const visible = waitingList.slice(scrollIndex, scrollIndex + VISIBLE_ITEMS)

  return (
    <div className="flex h-full flex-col">
      {lastCalled && (
        <div className="mb-6 rounded-2xl bg-pln-cyan p-6 text-center text-white shadow-lg">
          <div className="text-lg opacity-80">Dipanggil</div>
          <div className="text-8xl font-bold tracking-wider">
            {lastCalled.queueNumber}
          </div>
          <div className="mt-2 text-xl capitalize opacity-80">
            {lastCalled.serviceType} - Counter {lastCalled.counterNumber}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-pln-cyan/70">
          <div className="size-2 rounded-full bg-pln-cyan" />
          Antrian Menunggu ({waitingList.length})
        </div>

        <div className="space-y-2 transition-all duration-500">
          {visible.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-lg text-gray-500">
              Tidak ada antrian
            </div>
          ) : (
            visible.map((q, i) => (
              <div
                key={q.id}
                className={`flex items-center justify-between rounded-xl px-6 py-4 ${
                  i === 0 && scrollIndex === 0
                    ? 'bg-pln-cyan/10 ring-2 ring-pln-cyan'
                    : 'bg-gray-800/60 ring-1 ring-pln-cyan/5'
                }`}
              >
                <div className="flex items-center gap-4">
                  <span
                    className={`text-3xl font-bold ${
                      i === 0 && scrollIndex === 0
                        ? 'text-pln-cyan'
                        : 'text-white'
                    }`}
                  >
                    {q.queueNumber}
                  </span>
                  <span
                    className={`text-lg capitalize ${
                      i === 0 && scrollIndex === 0
                        ? 'text-pln-cyan'
                        : 'text-gray-300'
                    }`}
                  >
                    {q.serviceType}
                  </span>
                </div>
                <span
                  className={`text-sm ${
                    i === 0 && scrollIndex === 0
                      ? 'text-pln-cyan/70'
                      : 'text-gray-500'
                  }`}
                >
                  {new Date(q.createdAt).toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
