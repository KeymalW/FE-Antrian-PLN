import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { takeTicket } from '../services/queue'
import { getEstimatedWaitTime } from '../lib/estimatedWaitTime'
import type { EstimatedWait } from '../lib/estimatedWaitTime'
import {
  AlertTriangle,
  Zap,
  Search,
  Clock,
  TicketIcon,
  MaximizeIcon,
  MinimizeIcon,
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

export default function Kiosk() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [estimates, setEstimates] = useState<Record<string, EstimatedWait | null>>({})
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
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

  const topTwo = services.slice(0, 2)
  const bottomOne = services[2]

  return (
    <div className="flex h-screen flex-col bg-gradient-to-b from-white via-white to-pln-cyan/[0.02] text-gray-900">
      {/* Decorative background accent */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -right-40 -top-40 size-80 rounded-full bg-pln-cyan/[0.03]" />
        <div className="absolute -bottom-40 -left-40 size-96 rounded-full bg-pln-cyan/[0.02]" />
      </div>

      {/* Header */}
      <div className="group flex items-center justify-between bg-pln-teal px-8 py-4 shadow-md">
        <div className="flex items-center gap-4">
          <PLNLogo className="size-12" />
          <div>
            <h1 className="text-2xl font-bold tracking-wide text-white">Kiosk</h1>
            <p className="text-sm text-white/80">PT PLN (Persero)</p>
          </div>
        </div>
        <div className="flex items-center gap-3 opacity-0 transition-all duration-300 group-hover:opacity-100">
          <button
            onClick={toggleFullscreen}
            className="rounded-md p-1.5 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
            title={isFullscreen ? 'Keluar fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <MinimizeIcon className="size-5" /> : <MaximizeIcon className="size-5" />}
          </button>
        </div>
        <div className="text-right">
          <div className="text-sm text-white/80">Layanan Mandiri</div>
        </div>
      </div>

      {/* Body */}
      <div className="relative flex flex-1 flex-col items-center justify-center overflow-auto px-6 py-8">
        <div className="w-full max-w-3xl">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-pln-teal/10">
              <TicketIcon className="size-8 text-pln-teal" />
            </div>
            <h1 className="mb-2 text-3xl font-bold">Selamat Datang</h1>
            <p className="text-gray-500">
              Pilih jenis layanan untuk mengambil nomor antrian
            </p>
          </div>

          {error && (
            <div
              className="kiosk-error mb-6 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive"
              role="alert"
            >
              {error}
            </div>
          )}

          <div className="flex flex-col items-center gap-5">
            <div className="grid w-full grid-cols-1 gap-5 sm:grid-cols-2">
              {topTwo.map((svc) => {
                const Icon = svc.icon
                const est = estimates[svc.type]
                return (
                  <button
                    key={svc.type}
                    onClick={() => handleTakeTicket(svc.type)}
                    disabled={loading}
                    className="group/btn cursor-pointer rounded-2xl bg-pln-teal/80 p-8 text-center shadow-lg shadow-pln-teal/30 transition-all duration-300 hover:scale-[1.03] hover:bg-pln-teal hover:shadow-xl hover:shadow-pln-teal/40 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-white/20 transition-colors group-hover/btn:bg-white/30">
                      <Icon className="size-8 text-white" />
                    </div>
                    <div className="text-lg font-semibold text-white">{svc.label}</div>
                    <p className="mt-1 text-sm text-white/70">{svc.desc}</p>
                    {est && (
                      <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-yellow-300">
                        <Clock className="size-3.5" />
                        Est. {formatEstimate(est.estimatedMinutes)}
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
              })}
            </div> 

            <div className="w-full max-w-sm">
              {(() => {
                const svc = bottomOne
                const Icon = svc.icon
                const est = estimates[svc.type]
                return (
                  <button
                    key={svc.type}
                    onClick={() => handleTakeTicket(svc.type)}
                    disabled={loading}
                    className="group/btn w-full cursor-pointer rounded-2xl bg-pln-teal/80 p-8 text-center shadow-lg shadow-pln-teal/30 transition-all duration-300 hover:scale-[1.03] hover:bg-pln-teal hover:shadow-xl hover:shadow-pln-teal/40 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-white/20 transition-colors group-hover/btn:bg-white/30">
                      <Icon className="size-8 text-white" />
                    </div>
                    <div className="text-lg font-semibold text-white">{svc.label}</div>
                    <p className="mt-1 text-sm text-white/70">{svc.desc}</p>
                    {est && (
                      <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-yellow-300">
                        <Clock className="size-3.5" />
                        Est. {formatEstimate(est.estimatedMinutes)}
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
              })()}
            </div>
          </div>

          {loading && (
            <div className="mt-8 flex items-center justify-center gap-2 text-sm text-gray-500">
              <Spinner data-icon="inline-start" />
              Memproses tiket Anda...
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
