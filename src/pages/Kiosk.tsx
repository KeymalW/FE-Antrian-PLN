import { useState } from 'react'
import { takeTicket } from '../services/queue'
import { CreditCard, AlertTriangle, ClipboardList, Info, CheckCircle2, ArrowLeft } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Spinner } from '../components/ui/spinner'
import { PLNLogo } from '../components/layout/PLNLogo'
import type { ServiceType, QueueTicket } from '../types/queue'

const services: { type: ServiceType; label: string; icon: React.ElementType }[] = [
  { type: 'pembayaran', label: 'Pembayaran', icon: CreditCard },
  { type: 'pengaduan', label: 'Pengaduan', icon: AlertTriangle },
  { type: 'pendaftaran', label: 'Pendaftaran', icon: ClipboardList },
  { type: 'informasi', label: 'Informasi', icon: Info },
]

export default function Kiosk() {
  const [loading, setLoading] = useState(false)
  const [ticket, setTicket] = useState<QueueTicket | null>(null)
  const [error, setError] = useState('')

  const handleTakeTicket = async (serviceType: ServiceType) => {
    setLoading(true)
    setError('')
    setTicket(null)

    try {
      const result = await takeTicket(serviceType)
      setTicket(result)
    } catch {
      setError('Gagal mengambil tiket. Silakan coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setTicket(null)
    setError('')
  }

  if (ticket) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center px-4">
        <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-300">
          <Card className="overflow-hidden text-center ring-pln-cyan/30">
            <div className="h-2 bg-pln-cyan" />
            <CardContent className="py-10">
              <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-full bg-pln-cyan/10">
                <CheckCircle2 className="size-10 text-pln-cyan" />
              </div>
              <h1 className="mb-1 text-2xl font-bold">Tiket Berhasil</h1>
              <p className="mb-8 text-sm text-muted-foreground">
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

              <div className="mb-8 text-sm text-muted-foreground">
                Layanan:{' '}
                <span className="font-medium capitalize text-foreground">
                  {ticket.serviceType}
                </span>
              </div>

              <div className="rounded-lg bg-pln-cyan/5 px-4 py-3 text-sm text-muted-foreground">
                Silakan tunggu nomor Anda dipanggil dan menuju ke loket yang ditentukan
              </div>

              <div className="mt-8 flex justify-center gap-3">
                <Button variant="outline" onClick={handleReset}>
                  <ArrowLeft className="mr-2 size-4" />
                  Kembali
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4">
          <PLNLogo className="size-16" />
        </div>
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
              <p className="mt-1 text-sm text-muted-foreground">
                {svc.type === 'pembayaran' && 'Bayar tagihan listrik'}
                {svc.type === 'pengaduan' && 'Laporkan gangguan'}
                {svc.type === 'pendaftaran' && 'Daftar layanan baru'}
                {svc.type === 'informasi' && 'Tanya informasi'}
              </p>
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
