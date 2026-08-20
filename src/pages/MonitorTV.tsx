import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { MaximizeIcon, MinimizeIcon, Volume2Icon, VolumeXIcon, LogOutIcon } from 'lucide-react'
import { useQueueStore } from '../store/queueStore'
import { useAuthStore } from '../store/authStore'
import { useWebSocket } from '../hooks/useWebSocket'
import { useQueueSound } from '../hooks/useQueueSound'
import { getQueueList } from '../services/queue'
import { logout as logoutApi } from '../services/auth'
import { getMonitorVideos, getServerVideoVolume, setLocalVideoVolume } from '../services/settings'
import { QueueBoard } from '../components/monitor/QueueBoard'
import { VideoPlayer } from '../components/monitor/VideoPlayer'
import { QServeLogo } from '../components/layout/QServeLogo'
import { getServiceLabel } from '../lib/serviceTypes'
import type { QueueTicket, ServiceType } from '../types/queue'

const SERVICE_TYPES: ServiceType[] = ['pengaduan', 'pb_pd_migrasi', 'p2tl']

const DUCK_RATIO = 0.3
const DUCK_FLOOR = 0.1
const DUCK_DURATION_MS = 12000

const COUNTER_TO_SERVICE: Record<number, ServiceType> = {
  1: 'pengaduan',
  2: 'pb_pd_migrasi',
  3: 'p2tl',
}

export default function MonitorTV() {
  const { setQueueList, counterStatus } = useQueueStore()
  const { logout } = useAuthStore()
  const navigate = useNavigate()
  const { unlockAudio } = useQueueSound({
    ttsRate: 0.92,
    ttsPitch: 1,
    ttsVolume: 1,
  })
  const [waitingList, setWaitingList] = useState<QueueTicket[]>([])
  const [lastCalledByType, setLastCalledByType] = useState<Record<string, QueueTicket | null>>({})
  const [activeCall, setActiveCall] = useState<QueueTicket | null>(null)
  const [activeCallPulse, setActiveCallPulse] = useState(false)
  const [callCount, setCallCount] = useState(0)
  const [time, setTime] = useState(new Date())
  const fetchIdRef = useRef(0)
  const pulseRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [justCalledServiceType, setJustCalledServiceType] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [videoUrls, setVideoUrls] = useState<string[]>([])
  const [videoIndex, setVideoIndex] = useState(0)
  const [videoCount, setVideoCount] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [videoMuted, setVideoMuted] = useState(true)
  const [videoVolume, setVideoVolume] = useState(0.2)
  const [videoDucking, setVideoDucking] = useState(false)
  const duckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const effectiveVideoVolume = videoDucking
    ? Math.max(videoVolume * DUCK_RATIO, DUCK_FLOOR)
    : videoVolume

  const triggerVideoDuck = useCallback(() => {
    setVideoDucking(true)
    if (duckTimerRef.current) clearTimeout(duckTimerRef.current)
    duckTimerRef.current = setTimeout(() => setVideoDucking(false), DUCK_DURATION_MS)
  }, [])

  useEffect(() => {
    return () => {
      if (duckTimerRef.current) clearTimeout(duckTimerRef.current)
    }
  }, [])

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  useEffect(() => {
    const unlock = () => {
      unlockAudio()
      document.removeEventListener('pointerdown', unlock)
    }
    document.addEventListener('pointerdown', unlock)
    return () => document.removeEventListener('pointerdown', unlock)
  }, [unlockAudio])

  const toggleFullscreen = async () => {
    await unlockAudio()
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      document.documentElement.requestFullscreen()
    }
  }

  const handleLogout = async () => {
    try {
      await logoutApi()
    } catch {
      toast.error('Gagal logout dari server')
    }
    logout()
    navigate('/login')
  }

  const currentSrc = videoUrls[videoIndex]

  const handleVideoEnded = useCallback(() => {
    setVideoIndex((prev) => (prev + 1) % videoUrls.length)
  }, [videoUrls.length])

  useEffect(() => {
    getMonitorVideos()
      .then((list) => {
        setVideoUrls(list.map((v) => v.url))
        setVideoIndex(0)
      })
      .catch(() => setVideoUrls([]))

    getServerVideoVolume().then((v) => {
      setVideoVolume(v)
      setLocalVideoVolume(v)
    })
  }, [])

  if (videoCount !== videoUrls.length) {
    setVideoCount(videoUrls.length)
    if (videoUrls.length > 0 && videoIndex >= videoUrls.length) {
      setVideoIndex(0)
    }
  }

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const fetchAll = useCallback(async () => {
    const id = ++fetchIdRef.current
    const [waiting, called, serving] = await Promise.all([
      getQueueList({ status: 'waiting', perPage: 50 }),
      getQueueList({ status: 'called' }),
      getQueueList({ status: 'serving' }),
    ])
    if (id !== fetchIdRef.current) return
    setWaitingList(waiting)
    setQueueList(waiting)

    const byType: Record<string, QueueTicket | null> = {}
    for (const t of [...called, ...serving]) {
      const prev = byType[t.serviceType]
      if (!prev || (t.calledAt && (!prev.calledAt || t.calledAt > prev.calledAt))) {
        byType[t.serviceType] = t
      }
    }
    setLastCalledByType(byType)

    const allActive = [...called, ...serving].sort(
      (a, b) =>
        new Date(b.calledAt ?? b.createdAt).getTime() -
        new Date(a.calledAt ?? a.createdAt).getTime(),
    )
    setActiveCall(allActive[0] ?? null)
  }, [setQueueList])

  useWebSocket({
    onQueueCall: (msg) => {
      const payload = msg.payload as QueueTicket
      setLastCalledByType((prev) => ({
        ...prev,
        [payload.serviceType]: payload,
      }))

      if (pulseRef.current) clearTimeout(pulseRef.current)
      setActiveCall(payload)
      setActiveCallPulse(true)
      setCallCount((c) => c + 1)
      setJustCalledServiceType(payload.serviceType)
      pulseRef.current = setTimeout(() => {
        setActiveCallPulse(false)
        setJustCalledServiceType(null)
      }, 6000)

      triggerVideoDuck()
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
    <div className="flex h-screen flex-col bg-white text-gray-900">
      {/* Header */}
      <div className="group flex items-center justify-between border-b border-white/10 bg-[#001134] px-8 py-4 shadow-[0_8px_30px_rgb(0,0,0,0.25)] backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <QServeLogo className="h-12 w-auto" />
          <div>
            <h1 className="text-2xl font-bold tracking-wide text-white">
              Sistem Antrian
            </h1>
            <p className="text-sm text-white">PT PLN (Persero)</p>
          </div>
        </div>
        <div className="flex items-center gap-3 opacity-0 transition-all duration-300 group-hover:opacity-100">
          <span
            className={`size-2 rounded-full transition-opacity duration-300 ${
              refreshing ? 'opacity-100 bg-pln-cyan' : 'opacity-0'
            }`}
          />
          <button
            onClick={() => { unlockAudio().then(() => { setVideoMuted((prev) => !prev) }) }}
            className="rounded-md p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
            title={videoMuted ? 'Aktifkan suara video' : 'Matikan suara video'}
          >
            {videoMuted ? <VolumeXIcon className="size-5" /> : <Volume2Icon className="size-5" />}
          </button>
          {!videoMuted && (
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={videoVolume}
              onChange={(e) => {
                const v = Number(e.target.value)
                setVideoVolume(v)
                setLocalVideoVolume(v)
              }}
              className="h-1.5 w-20 cursor-pointer appearance-none rounded-full bg-white/20 accent-pln-cyan"
              title="Volume video"
            />
          )}
          <button
            onClick={toggleFullscreen}
            className="rounded-md p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
            title={isFullscreen ? 'Keluar fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <MinimizeIcon className="size-5" /> : <MaximizeIcon className="size-5" />}
          </button>
          <button
            onClick={handleLogout}
            className="rounded-md p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
            title="Logout"
          >
            <LogOutIcon className="size-5" />
          </button>
        </div>
        <div className="text-right">
          <div className="text-2xl font-light tracking-wider text-white">
            {time.toLocaleTimeString('id-ID', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </div>
          <div className="text-sm text-white">
            {time.toLocaleDateString('id-ID', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </div>
        </div>
      </div>

      {/* Top Section: Video + Active Call */}
      <div className="flex flex-[5] min-h-0 gap-4 p-6 pb-2">
        {/* Video Player */}
        <div className="flex w-1/2">
          <VideoPlayer
            src={currentSrc}
            className="w-full"
            loop={videoUrls.length <= 1}
            onEnded={handleVideoEnded}
            muted={videoMuted}
            volume={effectiveVideoVolume}
          />
        </div>

        {/* Active Call */}
        <div
          className={`flex w-1/2 flex-col items-center justify-center rounded-2xl bg-[#001134] ring-1 backdrop-blur transition-all duration-500 ${
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
                  {getServiceLabel(activeCall.serviceType)}
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
          {SERVICE_TYPES.map((serviceType) => {
            const counter = Object.entries(COUNTER_TO_SERVICE).find(
              ([, s]) => s === serviceType,
            )?.[0]
            const isPaused = counter ? (counterStatus[Number(counter)] ?? false) : false
            const ticket = lastCalledByType[serviceType]
            const isPulsing = justCalledServiceType === serviceType
              return (
              <div
                key={serviceType}
                className={`flex flex-1 flex-col items-center justify-center rounded-2xl p-4 ring-1 backdrop-blur transition-all duration-500 ${
                  isPaused
                    ? 'bg-red-950/40 ring-red-500/30'
                    : isPulsing
                      ? 'bg-[#001134] ring-pln-cyan/50 animate-pulse'
                      : 'bg-[#001134] ring-pln-cyan/10'
                }`}
              >
                <div className="mb-3 flex items-center gap-2 text-base font-bold uppercase tracking-wider text-pln-cyan/80">
                  <div
                    className={`size-2.5 rounded-full ${isPaused ? 'bg-red-500' : 'bg-pln-cyan'}`}
                  />
                  {getServiceLabel(serviceType)}
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
                ) : ticket ? (
                  <>
                    <div className="text-5xl font-bold tracking-tight text-pln-cyan">
                      {ticket.queueNumber}
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
        <div className="flex flex-[2] rounded-2xl bg-[#001134] p-4 ring-1 ring-pln-cyan/10 backdrop-blur">
          <QueueBoard waitingList={waitingList} />
        </div>
      </div>

      {/* Marquee */}
      <div className="shrink-0 overflow-hidden border-t border-pln-cyan/10 bg-[#001134] px-6 py-3">
        <p className="animate-marquee whitespace-nowrap text-sm text-white">
          Terima kasih telah mengunjungi loket pelayanan PLN. Harap siapkan
          dokumen yang diperlukan sebelum nomor antrian Anda dipanggil.
          Gunakan aplikasi PLN Mobile untuk kemudahan transaksi dalam
          genggaman Anda.
        </p>
      </div>
    </div>
  )
}
