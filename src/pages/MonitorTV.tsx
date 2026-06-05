import { useEffect, useState, useCallback } from 'react'
import { useQueueStore } from '../store/queueStore'
import { useWebSocket } from '../hooks/useWebSocket'
import { useQueueSound } from '../hooks/useQueueSound'
import { getQueueList, getLastCalled } from '../services/queue'
import { QueueBoard } from '../components/monitor/QueueBoard'
import { PLNLogo } from '../components/layout/PLNLogo'
import type { QueueTicket } from '../types/queue'

const COUNTERS = [1, 2, 3]

export default function MonitorTV() {
  const { setQueueList, setLastCalled } = useQueueStore()
  const { playCallSound } = useQueueSound()
  const [waitingList, setWaitingList] = useState<QueueTicket[]>([])
  const [lastCalledList, setLastCalledList] = useState<(QueueTicket | null)[]>(
    Array(COUNTERS.length).fill(null),
  )
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const fetchAll = useCallback(async () => {
    const [list] = await Promise.all([
      getQueueList({ status: 'waiting', perPage: 50 }),
    ])
    setWaitingList(list)
    setQueueList(list)

    const calledData = await Promise.all(
      COUNTERS.map((c) => getLastCalled(c)),
    )
    setLastCalledList(calledData)
  }, [setQueueList])

  useWebSocket({
    onQueueCall: (msg) => {
      const payload = msg.payload as QueueTicket
      if (payload.counterNumber) {
        setLastCalledList((prev) => {
          const next = [...prev]
          const idx = COUNTERS.indexOf(payload.counterNumber!)
          if (idx >= 0) next[idx] = payload
          return next
        })
      }
      setLastCalled(payload)
      playCallSound()
      fetchAll()
    },
    onQueueUpdate: () => { fetchAll() },
    onQueueComplete: () => { fetchAll() },
    onQueueSkip: () => { fetchAll() },
  })

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      if (!cancelled) await fetchAll()
    }

    load()
    const interval = setInterval(load, 30000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [fetchAll])

  return (
    <div className="flex h-screen flex-col bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white">
      <div className="flex items-center justify-between border-b border-white/10 bg-gray-900/95 px-10 py-5 shadow-[0_8px_30px_rgb(0,0,0,0.25)] backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <PLNLogo className="size-14" />
          <div>
            <h1 className="text-2xl font-bold tracking-wide">
              Sistem Antrian
            </h1>
            <p className="text-sm text-white/60">PT Perusahaan Listrik Negara</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-light tracking-wider">
            {time.toLocaleTimeString('id-ID', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </div>
          <div className="text-sm text-white/60">
            {time.toLocaleDateString('id-ID', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </div>
        </div>
      </div>

      <div className="grid flex-1 grid-cols-3 gap-4 overflow-hidden p-6">
        {COUNTERS.map((counter, idx) => (
          <div
            key={counter}
            className="flex flex-col items-center justify-center rounded-2xl bg-gray-800/60 p-4 ring-1 ring-pln-cyan/10 backdrop-blur"
          >
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-pln-cyan/70">
              <div className="size-2 rounded-full bg-pln-cyan" />
              Counter {counter}
            </div>
            {lastCalledList[idx] ? (
              <>
                <div className="text-6xl font-bold tracking-tight text-pln-cyan">
                  {lastCalledList[idx]!.queueNumber}
                </div>
                <div className="mt-2 text-sm capitalize text-gray-400">
                  {lastCalledList[idx]!.serviceType}
                </div>
              </>
            ) : (
              <div className="text-4xl font-bold tracking-tight text-gray-600">---</div>
            )}
          </div>
        ))}
      </div>

      <div className="h-[30vh] border-t border-pln-cyan/10 bg-gray-950/50 px-6 py-4">
        <QueueBoard waitingList={waitingList} lastCalled={null} />
      </div>
    </div>
  )
}
