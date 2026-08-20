import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { takeTicket } from '../services/queue'
import { logout as logoutApi } from '../services/auth'
import { useAuthStore } from '../store/authStore'
import {
  Ticket,
  Scale,
  MaximizeIcon,
  MinimizeIcon,
  LogOutIcon,
  AlertTriangle,
} from 'lucide-react'
import { Spinner } from '../components/ui/spinner'
import type { ServiceType } from '../types/queue'

const services: { type: ServiceType; label: string; icon: React.ElementType }[] = [
  { type: 'p2tl', label: 'P2TL', icon: Ticket },
  { type: 'pb_pd_migrasi', label: 'PB/PD/migrasi', icon: Ticket },
  { type: 'pengaduan', label: 'PENGADUAN', icon: Scale },
]

const WEEKDAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

function ServiceCard({
  svc,
  loading,
  delay,
  onClick,
}: {
  svc: (typeof services)[number]
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
      className="group relative flex w-full flex-col items-center rounded-[20px] bg-white px-6 py-8
        shadow-[0_18px_45px_-14px_rgba(3,11,36,0.55)]
        animate-[kiosk-card-in_0.5s_ease-out_both]
        transition-all duration-200 ease-out
        hover:-translate-y-1.5 hover:shadow-[0_28px_60px_-16px_rgba(3,11,36,0.7)]
        active:scale-[0.98]
        disabled:cursor-not-allowed disabled:opacity-70"
      aria-label={`Ambil tiket ${svc.label}`}
    >
      <div
        className="mb-5 flex size-24 items-center justify-center rounded-2xl
          bg-gradient-to-br from-pln-100 to-pln-50 text-pln-600
          ring-1 ring-pln-100 transition-transform duration-200 group-hover:scale-105"
      >
        <Icon className="size-12" strokeWidth={1.7} />
      </div>

      <div className="flex min-h-20 items-center justify-center text-balance text-center text-2xl font-bold leading-tight text-pln-700">
        {svc.label}
      </div>

      <div className="mt-auto pt-6">
        <span
          className="inline-flex items-center gap-2 rounded-full border border-pln-200
            bg-pln-50 px-4 py-1.5 text-sm font-semibold text-pln-600"
        >
          <span className="size-1.5 rounded-full bg-pln-400" aria-hidden="true" />
          Belum Ada Antrian
        </span>
      </div>
    </button>
  )
}

export default function Kiosk() {
  const navigate = useNavigate()
  const { logout } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [time, setTime] = useState(new Date())

  const handleLogout = () => {
    logoutApi().catch(() => toast.error('Gagal logout dari server'))
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

  const hours = time.getHours().toString().padStart(2, '0')
  const minutes = time.getMinutes().toString().padStart(2, '0')
  const seconds = time.getSeconds().toString().padStart(2, '0')
  const dateLabel = `${WEEKDAYS[time.getDay()]}, ${time.getDate()} ${MONTHS[time.getMonth()]} ${time.getFullYear()}`

  return (
    <div className="relative flex h-screen w-full select-none flex-col overflow-hidden bg-pln-900 font-sans text-white">
      {/* ===== Background: blue gradient + subtle lighting ===== */}
      <div
        className="absolute inset-0"
        aria-hidden="true"
        style={{
          background: 'linear-gradient(180deg, #0a2f8f 0%, #0a37a8 32%, #06153f 78%, #030b24 100%)',
        }}
      />
      <div
        className="absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(58% 42% at 50% -6%, rgba(64, 122, 255, 0.5), rgba(64, 122, 255, 0) 70%)',
        }}
      />
      <div
        className="absolute -left-32 bottom-[-10%] size-[38rem] rounded-full bg-pln-500/20 blur-[130px]"
        aria-hidden="true"
      />
      <div
        className="absolute -right-40 bottom-[-18%] size-[42rem] rounded-full bg-pln-700/40 blur-[140px]"
        aria-hidden="true"
      />
      <div
        className="absolute left-1/2 top-[26%] size-[26rem] -translate-x-1/2 rounded-full bg-pln-400/15 blur-[120px] animate-kiosk-glow"
        aria-hidden="true"
      />

      {/* ===== Header: clock top-right + logout top-left ===== */}
      <div
        className="pointer-events-none absolute right-8 top-7 z-10 text-right"
        aria-hidden="true"
      >
        <div className="text-3xl font-bold tabular-nums tracking-widest text-white/90">
          {hours}:{minutes}:{seconds}
        </div>
        <div className="mt-1 text-sm font-medium text-white/55">{dateLabel}</div>
      </div>

      <button
        onClick={handleLogout}
        className="absolute left-8 top-7 z-20 flex size-10 items-center justify-center rounded-full
          bg-white/10 text-white/50 backdrop-blur-sm transition-colors hover:bg-white/20 hover:text-white"
        title="Logout"
        aria-label="Logout"
      >
        <LogOutIcon className="size-5" />
      </button>

      {/* ===== Welcome header ===== */}
      <header className="pointer-events-none relative z-10 flex flex-col items-center px-8 pt-14 text-center">
        <div className="relative">
          <div
            className="absolute -inset-5 rounded-full bg-pln-400/30 blur-2xl animate-kiosk-glow"
            aria-hidden="true"
          />
          <img
            src="/assets/logo-pln.png"
            alt="Logo PLN"
            className="relative h-24 w-24 rounded-full bg-white p-2 shadow-[0_8px_30px_rgba(3,11,36,0.45)]"
          />
        </div>

        <h1 className="mt-6 text-2xl font-light tracking-wide text-white/90">Selamat Datang di</h1>
        <p className="mt-1 font-display text-5xl font-bold tracking-tight text-white md:text-6xl">
          ULP Subang
        </p>
        <p className="mt-4 text-lg font-medium text-white/80">Silakan pilih layanan yang Anda butuhkan</p>

        <div
          className="mt-5 inline-flex items-center gap-2.5 rounded-full bg-white/10 px-6 py-2.5
            text-base font-medium text-white/70 backdrop-blur-sm animate-pulse"
        >
          <span aria-hidden="true">☝️</span>
          Sentuh layar untuk mencetak tiket
        </div>
      </header>

      {/* ===== Service cards ===== */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-12 pb-10 pt-8">
        {error && (
          <div
            className="absolute top-0 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2
              rounded-full border border-red-300/40 bg-red-500/25 px-5 py-2.5 text-sm font-medium
              text-red-100 backdrop-blur-sm kiosk-error"
            role="alert"
          >
            <AlertTriangle className="size-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="grid w-full max-w-6xl grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-8">
          {services.map((svc, i) => (
            <ServiceCard
              key={svc.type}
              svc={svc}
              loading={loading}
              delay={i * 110}
              onClick={() => handleTakeTicket(svc.type)}
            />
          ))}
        </div>
      </main>

      {/* ===== Footer ===== */}
      <footer className="relative z-10 flex items-center justify-between px-8 pb-7">
        <div className="text-sm text-white/45">PT PLN (Persero) · ULP Subang</div>

        <button
          onClick={toggleFullscreen}
          className="flex size-14 items-center justify-center rounded-full bg-white text-pln-600
            shadow-[0_10px_30px_-8px_rgba(3,11,36,0.7)]
            transition-all duration-200 hover:scale-105 hover:shadow-[0_14px_36px_-8px_rgba(3,11,36,0.85)]
            active:scale-95 z-20"
          title={isFullscreen ? 'Keluar fullscreen' : 'Fullscreen'}
          aria-label={isFullscreen ? 'Keluar fullscreen' : 'Fullscreen'}
        >
          {isFullscreen ? <MinimizeIcon className="size-6" /> : <MaximizeIcon className="size-6" />}
        </button>
      </footer>

      {/* ===== Loading overlay ===== */}
      {loading && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-pln-900/70 backdrop-blur-sm">
          <div className="flex size-20 items-center justify-center rounded-full bg-white/10">
            <Spinner className="size-9 text-pln-300" />
          </div>
          <p className="text-lg font-medium text-white/85">Mencetak tiket, harap tunggu...</p>
        </div>
      )}
    </div>
  )
}