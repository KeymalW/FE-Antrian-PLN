import { useState, useEffect, useRef } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { takeTicket } from '../services/queue'
import { getEstimatedWaitTime } from '../lib/estimatedWaitTime'
import type { EstimatedWait } from '../lib/estimatedWaitTime'
import {
  CreditCard,
  AlertTriangle,
  ClipboardList,
  Info,
  CheckCircle2,
  ArrowLeft,
  Printer,
  Clock,
} from 'lucide-react'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Spinner } from '../components/ui/spinner'
import type { ServiceType, QueueTicket } from '../types/queue'

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
  const [loading, setLoading] = useState(false)
  const [ticket, setTicket] = useState<QueueTicket | null>(null)
  const [error, setError] = useState('')
  const [estimates, setEstimates] = useState<Record<ServiceType, EstimatedWait | null>>(
    {} as Record<ServiceType, EstimatedWait | null>,
  )
  const [selectedType, setSelectedType] = useState<ServiceType | null>(null)
  const [estimating, setEstimating] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

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
    setTicket(null)
    setSelectedType(serviceType)
    setEstimating(true)

    try {
      const result = await takeTicket(serviceType)
      setTicket(result)
    } catch {
      setError('Gagal mengambil tiket. Silakan coba lagi.')
    } finally {
      setLoading(false)
      setEstimating(false)
    }
  }

  const handleReset = () => {
    setTicket(null)
    setError('')
    setSelectedType(null)
  }

  const handlePrint = () => {
    window.print()
  }

  const baseUrl = import.meta.env.VITE_PUBLIC_URL ?? window.location.origin
  const qrValue = ticket ? `${baseUrl}/track/${ticket.id}` : ''

  if (ticket) {
    const est = selectedType ? estimates[selectedType] : null

    return (
      <>
        <div className="flex min-h-[80vh] items-center justify-center px-4">
          <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-300">
            <Card className="overflow-hidden text-center ring-pln-cyan/30">
              <div className="h-2 bg-pln-cyan" />
              <CardContent className="py-10">
                <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-full bg-pln-cyan/10">
                  <CheckCircle2 className="size-10 text-pln-cyan" />
                </div>
                <h1 className="mb-1 text-2xl font-bold">Tiket Berhasil</h1>
                <p className="mb-6 text-sm text-muted-foreground">
                  Silakan simpan nomor antrian Anda
                </p>

                <div className="mx-auto mb-6 max-w-[200px] rounded-xl bg-pln-cyan/5 py-6 ring-1 ring-pln-cyan/20">
                  <div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">
                    Nomor Antrian
                  </div>
                  <div className="text-5xl font-bold text-pln-cyan">
                    {ticket.queueNumber}
                  </div>
                </div>

                <div className="mb-4 text-sm text-muted-foreground">
                  Layanan:{' '}
                  <span className="font-medium capitalize text-foreground">
                    {ticket.serviceType}
                  </span>
                </div>

                <div className="mb-6 flex justify-center">
                  <div className="inline-block rounded-lg bg-white p-2 ring-1 ring-pln-cyan/20">
                    <QRCodeCanvas value={qrValue} size={140} level="M" />
                  </div>
                </div>

                {est && (
                  <div className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
                    <div className="flex items-center justify-center gap-2 font-medium">
                      <Clock className="size-4" />
                      Estimasi waktu tunggu
                    </div>
                    <p className="mt-1">
                      Sekitar <strong>{formatEstimate(est.estimatedMinutes)}</strong> (posisi
                      antrian ke-{est.queuePosition})
                    </p>
                  </div>
                )}

                <div className="rounded-lg bg-pln-cyan/5 px-4 py-3 text-sm text-muted-foreground">
                  Silakan tunggu nomor Anda dipanggil dan menuju ke loket yang ditentukan
                </div>

                <div className="mt-6 flex justify-center gap-3">
                  <Button onClick={handlePrint}>
                    <Printer className="mr-2 size-4" />
                    Cetak Tiket
                  </Button>
                  <Button variant="outline" onClick={handleReset}>
                    <ArrowLeft className="mr-2 size-4" />
                    Kembali
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div ref={printRef} className="print-only">
          <div className="print-ticket">
            <div className="print-header">PT PLN (Persero)</div>
            <div className="print-title">TIKET ANTRIAN</div>
            <div className="print-number">{ticket.queueNumber}</div>
            <div className="print-service">{ticket.serviceType}</div>
            <div className="print-divider" />
            <div className="print-qr">
              <QRCodeCanvas value={qrValue} size={180} level="M" />
            </div>
            <div className="print-divider" />
            <div className="print-footer">
              <div>{new Date(ticket.createdAt).toLocaleDateString('id-ID')}</div>
              <div>{new Date(ticket.createdAt).toLocaleTimeString('id-ID')}</div>
            </div>
            <div className="print-message">Silakan tunggu nomor Anda dipanggil</div>
          </div>
        </div>
      </>
    )
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
          {estimating ? 'Menghitung estimasi...' : 'Memproses tiket Anda...'}
        </div>
      )}
    </div>
  )
}
