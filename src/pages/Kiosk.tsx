import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { takeTicket } from '../services/queue'
import { getEstimatedWaitTime } from '../lib/estimatedWaitTime'
import type { EstimatedWait } from '../lib/estimatedWaitTime'
import {
  CreditCard,
  AlertTriangle,
  ClipboardList,
  Info,
  Clock,
} from 'lucide-react'
import { Spinner } from '../components/ui/spinner'
import type { ServiceType } from '../types/queue'

const services: { type: ServiceType; label: string; icon: React.ElementType; desc: string }[] = [
  { type: 'pembayaran', label: 'Pembayaran', icon: CreditCard, desc: 'Bayar tagihan listrik' },
  { type: 'pengaduan', label: 'Pengaduan', icon: AlertTriangle, desc: 'Laporkan gangguan' },
  { type: 'pendaftaran', label: 'Pendaftaran', icon: ClipboardList, desc: 'Daftar layanan baru' },
  { type: 'informasi', label: 'Informasi', icon: Info, desc: 'Tanya informasi' },
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
  const [estimates, setEstimates] = useState<Record<ServiceType, EstimatedWait | null>>(
    {} as Record<ServiceType, EstimatedWait | null>,
  )

  useEffect(() => {
    const allTypes: ServiceType[] = ['pembayaran', 'pengaduan', 'pendaftaran', 'informasi']
    allTypes.forEach(async (t) => {
      try {
        const est = await getEstimatedWaitTime(t)
        setEstimates((prev) => ({ ...prev, [t]: est }))
      } catch {
        setEstimates((prev) => ({ ...prev, [t]: null }))
      }
    })
  }, [])

  const handleTakeTicket = async (serviceType: ServiceType) => {
    setLoading(true)
    setError('')

    try {
      const result = await takeTicket(serviceType)
      navigate(`/track/${result.id}`)
    } catch {
      setError('Gagal mengambil tiket. Silakan coba lagi.')
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="mb-1 text-3xl font-bold">Selamat Datang</h1>
        <p className="text-muted-foreground">
          Pilih jenis layanan untuk mengambil nomor antrian
        </p>
      </div>

      {error && (
        <div
          className="mb-6 animate-in slide-in-from-top-2 fade-in rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {services.map((svc) => {
          const Icon = svc.icon
          const est = estimates[svc.type]
          return (
            <button
              key={svc.type}
              onClick={() => handleTakeTicket(svc.type)}
              disabled={loading}
              className="group cursor-pointer rounded-xl border-2 border-pln-cyan/20 bg-card p-8 text-center transition-all duration-300 hover:scale-[1.03] hover:border-pln-cyan/50 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
            >
              <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-pln-cyan/10 transition-colors group-hover:bg-pln-cyan/20">
                <Icon className="size-8 text-pln-cyan" />
              </div>
              <div className="text-lg font-semibold">{svc.label}</div>
              <p className="mt-1 text-sm text-muted-foreground">{svc.desc}</p>
              {est && (
                <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-amber-700">
                  <Clock className="size-3.5" />
                  Est. {formatEstimate(est.estimatedMinutes)}
                </div>
              )}
              {!est && (
                <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="size-3.5" />
                  Menghitung estimasi...
                </div>
              )}
            </button>
          )
        })}
      </div>

      {loading && (
        <div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Spinner data-icon="inline-start" />
          Memproses tiket Anda...
        </div>
      )}
    </div>
  )
}
