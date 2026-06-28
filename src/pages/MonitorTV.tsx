import { useEffect, useState, useCallback, useRef } from 'react'
import { useQueueStore } from '../store/queueStore'
import { useWebSocket } from '../hooks/useWebSocket'
import { useQueueSound } from '../hooks/useQueueSound'
import { getQueueList, getLastCalled } from '../services/queue'
import { QueueBoard } from '../components/monitor/QueueBoard'
import { VideoPlayer } from '../components/monitor/VideoPlayer'
import { PLNLogo } from '../components/layout/PLNLogo'
import { getServiceLabel } from '../lib/serviceTypes'
import type { QueueTicket } from '../types/queue'

const COUNTERS = [1, 2, 3]

export default function MonitorTV() {
  const { setQueueList, counterStatus } = useQueueStore()
  const { playCallSound, announceQueueCall } = useQueueSound()
  const [waitingList, setWaitingList] = useState<QueueTicket[]>([])
  const [lastCalledList, setLastCalledList] = useState<(QueueTicket | null)[]>(
    Array(COUNTERS.length).fill(null),
  )
  const [activeCall, setActiveCall] = useState<QueueTicket | null>(null)
  const [activeCallPulse, setActiveCallPulse] = useState(false)
  const [callCount, setCallCount] = useState(0)
  const [time, setTime] = useState(new Date())
  const fetchIdRef = useRef(0)
  const pulseRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [justCalledCounter, setJustCalledCounter] = useState<number | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const fetchAll = useCallback(async () => {
    const id = ++fetchIdRef.current
    const [list] = await Promise.all([
      getQueueList({ status: 'waiting', perPage: 50 }),
    ])
    if (id !== fetchIdRef.current) return
    setWaitingList(list)
    setQueueList(list)

    const calledData = await Promise.all(
      COUNTERS.map((c) => getLastCalled(c)),
    )
    if (id !== fetchIdRef.current) return
    setLastCalledList(calledData)

    const valid = calledData.filter(Boolean) as QueueTicket[]
    if (valid.length > 0) {
      const sorted = valid.sort(
        (a, b) =>
          new Date(b.calledAt ?? b.createdAt).getTime() -
          new Date(a.calledAt ?? a.createdAt).getTime(),
      )
      setActiveCall(sorted[0])
    }
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

      if (pulseRef.current) clearTimeout(pulseRef.current)
      setActiveCall(payload)
      setActiveCallPulse(true)
      setCallCount((c) => c + 1)
      setJustCalledCounter(payload.counterNumber)
      pulseRef.current = setTimeout(() => {
        setActiveCallPulse(false)
        setJustCalledCounter(null)
      }, 6000)

      playCallSound()
      announceQueueCall(payload)
      fetchAll()
    },
    onQueueUpdate: () => { fetchAll() },
    onQueueComplete: () => { fetchAll() },
    onQueueSkip: () => { fetchAll() },
  })

  useEffect(() => {
    let cancelled = false
    let refreshTimer: ReturnType<typeof setTimeout> | null = null
    const load = async () => {
      if (cancelled) return
      setRefreshing(true)
      await fetchAll()
      if (cancelled) return
      if (refreshTimer) clearTimeout(refreshTimer)
      refreshTimer = setTimeout(() => setRefreshing(false), 800)
    }
    load()
    const interval = setInterval(load, 30000)
    return () => {
      cancelled = true
      clearInterval(interval)
      if (refreshTimer) clearTimeout(refreshTimer)
    }
  }, [fetchAll])

  return (
    <div className="flex h-screen flex-col bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 bg-gray-900/95 px-8 py-4 shadow-[0_8px_30px_rgb(0,0,0,0.25)] backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <PLNLogo className="size-12" />
          <div>
            <h1 className="text-2xl font-bold tracking-wide">
              Sistem Antrian
            </h1>
            <p className="text-sm text-white/60">PT Perusahaan Listrik Negara</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`size-2 rounded-full transition-opacity duration-300 ${
              refreshing ? 'opacity-100 bg-pln-cyan' : 'opacity-0'
            }`}
          />
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
      </div>

      {/* Top Section: Video + Active Call */}
      <div className="flex flex-[5] min-h-0 gap-4 p-6 pb-2">
        {/* Video Player */}
        <div className="flex w-1/2">
          <VideoPlayer
            youtubeIds={['v2Q_1n1il-4', 'd7jQzkWaqxg']}
            className="w-full"
          />
        </div>

        {/* Active Call */}
        <div
          className={`flex w-1/2 flex-col items-center justify-center rounded-2xl bg-gray-800/60 ring-1 backdrop-blur transition-all duration-500 ${
            activeCallPulse ? 'ring-pln-cyan/50 animate-call-glow' : 'ring-pln-cyan/10'
          }`}
        >
          {activeCall ? (
            <>
              <div className="mb-2 text-lg font-semibold uppercase tracking-wider text-pln-cyan/70">
                Nomor Panggilan
              </div>
              <div
                key={callCount}
                className={`text-8xl font-bold tracking-tight text-pln-cyan ${
                  activeCallPulse ? 'animate-call-pop' : ''
                }`}
              >
                {activeCall.queueNumber}
              </div>
              <div className="mt-3 text-3xl capitalize text-gray-200">
                {getServiceLabel(activeCall.serviceType)}
              </div>
              {activeCall.counterNumber != null && (
                <div className="mt-2 flex items-center gap-2 text-xl text-gray-400">
                  <div className="size-3 rounded-full bg-pln-cyan" />
                  Loket {activeCall.counterNumber}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="mb-2 text-lg font-semibold uppercase tracking-wider text-pln-cyan/70">
                Nomor Panggilan
              </div>
              <div className="text-8xl font-bold tracking-tight text-gray-600">
                ---
              </div>
              <div className="mt-3 text-3xl capitalize text-gray-600">
                Menunggu
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bottom Section: Counter Cards + QueueBoard */}
      <div className="flex flex-[4] min-h-0 gap-4 px-6 pb-4 pt-2">
        {/* Counter Cards */}
        <div className="flex flex-[3] gap-3">
          {COUNTERS.map((counter, idx) => {
            const isPaused = counterStatus[counter] ?? false
            return (
              <div
                key={counter}
                className={`flex flex-1 flex-col items-center justify-center rounded-2xl p-4 ring-1 backdrop-blur transition-all duration-500 ${
                  isPaused
                    ? 'bg-red-950/40 ring-red-500/30'
                    : justCalledCounter === counter
                      ? 'bg-gray-800/60 ring-pln-cyan/50 animate-pulse'
                      : 'bg-gray-800/60 ring-pln-cyan/10'
                }`}
              >
                <div className="mb-3 flex items-center gap-2 text-base font-bold uppercase tracking-wider text-pln-cyan/80">
                  <div
                    className={`size-2.5 rounded-full ${isPaused ? 'bg-red-500' : 'bg-pln-cyan'}`}
                  />
                  Loket {counter}
                </div>

                {isPaused ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="rounded-full border-2 border-red-500/50 px-6 py-1.5 text-base font-bold tracking-wider text-red-400">
                      ISTIRAHAT
                    </div>
                    <div className="text-4xl font-bold tracking-tight text-gray-600">
                      ---
                    </div>
                  </div>
                ) : lastCalledList[idx] ? (
                  <>
                    <div className="text-5xl font-bold tracking-tight text-pln-cyan">
                      {lastCalledList[idx]!.queueNumber}
                    </div>
                    <div className="mt-1 text-lg capitalize text-gray-300">
                      {getServiceLabel(lastCalledList[idx]!.serviceType)}
                    </div>
                  </>
                ) : (
                  <div className="text-4xl font-bold tracking-tight text-gray-600">
                    ---
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* QueueBoard Compact */}
        <div className="flex flex-[2] rounded-2xl bg-gray-800/60 p-4 ring-1 ring-pln-cyan/10 backdrop-blur">
          <QueueBoard waitingList={waitingList} />
        </div>
      </div>

      {/* Marquee */}
      <div className="shrink-0 overflow-hidden border-t border-pln-cyan/10 bg-gray-950/50 px-6 py-3">
        <p className="animate-marquee whitespace-nowrap text-sm text-pln-cyan/60">
          Terima kasih telah mengunjungi loket pelayanan PLN. Harap siapkan
          dokumen yang diperlukan sebelum nomor antrian Anda dipanggil.
          Gunakan aplikasi PLN Mobile untuk kemudahan transaksi dalam
          genggaman Anda.
        </p>
      </div>
    </div>
  )
}
