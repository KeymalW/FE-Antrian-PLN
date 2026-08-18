import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { takeTicket } from '../services/queue'
import { logout as logoutApi } from '../services/auth'
import { useAuthStore } from '../store/authStore'
import { getEstimatedWaitTime } from '../lib/estimatedWaitTime'
import type { EstimatedWait } from '../lib/estimatedWaitTime'
import {
  AlertTriangle,
  Zap,
  Search,
  Clock,
  MaximizeIcon,
  MinimizeIcon,
  Users,
  LogOutIcon,
} from 'lucide-react'
import { Spinner } from '../components/ui/spinner'
import { PLNLogo } from '../components/layout/PLNLogo'
import type { ServiceType } from '../types/queue'

const services: { type: ServiceType; label: string; icon: React.ElementType; desc: string }[] = [
  { type: 'pengaduan', label: 'Pengaduan', icon: AlertTriangle, desc: 'Lapor gangguan atau keluhan' },
  { type: 'pb_pd_migrasi', label: 'PB/PD/Migrasi', icon: Zap, desc: 'Pasang baru, perubahan daya, migrasi' },
  { type: 'p2tl', label: 'P2TL', icon: Search, desc: 'Penertiban pemakaian tenaga listrik' },
]

function formatEstimate(minutes: number): string {
  if (minutes < 60) return `${minutes} menit`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h} jam ${m} menit` : `${h} jam`
}

function ServiceCard({
  svc,
  est,
  loading,
  delay,
  onClick,
}: {
  svc: (typeof services)[number]
  est: EstimatedWait | null | undefined
  loading: boolean
  delay: number
  onClick: () => void
}) {
  const Icon = svc.icon

  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{ animationDelay: `${delay}ms` }}
      className="group/card relative w-full cursor-pointer overflow-hidden rounded-2xl bg-pln-teal/80 p-10 text-center
        animate-[kiosk-card-in_0.5s_ease-out_both]
        transition-all duration-200 ease-out
        hover:scale-[1.03] hover:shadow-xl hover:shadow-pln-teal/20
        active:scale-[1.02]
        disabled:cursor-not-allowed disabled:opacity-50"
    >
      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-white/0 transition-colors duration-300 group-hover/card:bg-white/[0.06]" />
      <div className="mx-auto mb-4 flex size-20 items-center justify-center rounded-full bg-white/20">
        <Icon className="size-10 text-white" />
      </div>
      <div className="text-xl font-semibold text-white">{svc.label}</div>
      <p className="mt-1 text-base text-white/70">{svc.desc}</p>

      {est && (
        <div className="mt-3 flex flex-col items-center gap-2">
          <div className="flex items-center justify-center gap-1.5 text-xs text-yellow-300">
            <Clock className="size-3.5" />
            Est. {formatEstimate(est.estimatedMinutes)}
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs text-white/90">
            <Users className="size-3" />
            {est.waitingCount === 0
              ? 'Tidak ada antrean'
              : `${est.waitingCount} orang dalam antrean`}
          </div>
        </div>
      )}
      {!est && (
        <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-white/50">
          <Clock className="size-3.5" />
          Menghitung estimasi...
        </div>
      )}
    </button>
  )
}

export default function Kiosk() {
  const navigate = useNavigate()
  const { logout } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [estimates, setEstimates] = useState<Record<string, EstimatedWait | null>>({})
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [time, setTime] = useState(new Date())

  const handleLogout = async () => {
    try {
      await logoutApi()
    } catch {
      toast.error('Gagal logout dari server')
    }
    logout()
    navigate('/login')
  }

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const toggleFullscreen = async () => {
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      document.documentElement.requestFullscreen()
    }
  }

  useEffect(() => {
    let cancelled = false
    const allTypes: ServiceType[] = ['pengaduan', 'pb_pd_migrasi', 'p2tl']

    allTypes.forEach(async (t) => {
      try {
        const est = await getEstimatedWaitTime(t)
        if (!cancelled) setEstimates((prev) => ({ ...prev, [t]: est }))
      } catch {
        if (!cancelled) setEstimates((prev) => ({ ...prev, [t]: null }))
      }
    })

    return () => {
      cancelled = true
    }
  }, [])

  const handleTakeTicket = async (serviceType: ServiceType) => {
    setLoading(true)
    setError('')

    try {
      const result = await takeTicket(serviceType)
      navigate(`/track/${result.id}`)
    } catch (err) {
      const userMsg = (err as { userMessage?: string })?.userMessage
      setError(userMsg ?? 'Gagal mengambil tiket. Silakan coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-screen flex-col bg-gradient-to-b from-white via-white to-pln-cyan/[0.03] text-gray-900">


      {/* Header — portrait-friendly stacked layout */}
      <div className="group relative bg-pln-teal px-5 py-3 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <PLNLogo className="size-10" />
            <div>
              <h1 className="text-xl font-bold tracking-wide text-white">Kiosk</h1>
              <p className="text-xs text-white/80">PT PLN (Persero)</p>
            </div>
          </div>

          <div className="text-right">
            <div className="text-2xl font-bold text-white tabular-nums tracking-wider">
              {time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="text-[10px] text-white/60">
              {time.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}
            </div>
          </div>
        </div>

        {/* Second row: Layanan Mandiri + fullscreen toggle + logout */}
        <div className="mt-1 flex items-center justify-between">
          <div className="text-xs text-white/70">Layanan Mandiri</div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleLogout}
              className="rounded-md p-1 text-white/50 transition-colors hover:bg-white/20 hover:text-white
                opacity-0 transition-all duration-300 group-hover:opacity-100"
              title="Logout"
            >
              <LogOutIcon className="size-4" />
            </button>
            <button
              onClick={toggleFullscreen}
              className="rounded-md p-1 text-white/50 transition-colors hover:bg-white/20 hover:text-white
                opacity-0 transition-all duration-300 group-hover:opacity-100"
              title={isFullscreen ? 'Keluar fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <MinimizeIcon className="size-4" /> : <MaximizeIcon className="size-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Body — compact for portrait */}
      <div className="relative flex flex-1 flex-col items-center justify-center overflow-x-hidden overflow-y-auto px-5 py-2">
        <div className="w-full max-w-xl">
          {/* Welcome section — smaller */}
          <div className="mb-3 text-center">
            <div className="mx-auto mb-3 flex size-16 items-center justify-center">
              <PLNLogo className="size-14" />
            </div>
            <h1 className="mb-1 text-4xl font-bold">Selamat Datang</h1>
            <p className="mb-1 text-xl font-medium text-gray-700">di PLN ULP Subang</p>
            <p className="text-lg text-gray-500">
              Pilih layanan untuk mengambil nomor antrian
            </p>
          </div>

          {error && (
            <div
              className="kiosk-error mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive"
              role="alert"
            >
              {error}
            </div>
          )}

          {/* Service cards — 2 top, 1 bottom */}
          <div className="flex flex-col items-center gap-3">
            <div className="grid w-full grid-cols-2 gap-3">
              {services.slice(0, 2).map((svc, i) => (
                <ServiceCard
                  key={svc.type}
                  svc={svc}
                  est={estimates[svc.type]}
                  loading={loading}
                  delay={i * 100}
                  onClick={() => handleTakeTicket(svc.type)}
                />
              ))}
            </div>
            <div className="w-full flex justify-center">
              <div className="w-1/2">
                <ServiceCard
                  svc={services[2]}
                  est={estimates[services[2].type]}
                  loading={loading}
                  delay={200}
                  onClick={() => handleTakeTicket(services[2].type)}
                />
              </div>
            </div>
          </div>

          {loading && (
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-500">
              <Spinner data-icon="inline-start" />
              Memproses tiket Anda...
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200/60 bg-white/50 px-5 py-3 text-center text-sm text-gray-400">
        Jam Operasional: 08.00 – 15.00 WIB | Hari Kerja
      </div>
    </div>
  )
}
