import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { QRCodeCanvas } from 'qrcode.react'
import { getTicketById, getQueueList } from '../services/queue'
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Printer,
  ArrowLeft,
} from 'lucide-react'
import { Button } from '../components/ui/button'
import type { QueueTicket } from '../types/queue'

const statusLabels: Record<string, string> = {
  waiting: 'Menunggu',
  called: 'Dipanggil',
  serving: 'Dilayani',
  completed: 'Selesai',
  skipped: 'Dilewati',
}

const statusColors: Record<string, string> = {
  waiting: 'text-blue-600 bg-blue-50 ring-blue-200',
  called: 'text-amber-600 bg-amber-50 ring-amber-200',
  serving: 'text-green-600 bg-green-50 ring-green-200',
  completed: 'text-gray-600 bg-gray-50 ring-gray-200',
  skipped: 'text-red-600 bg-red-50 ring-red-200',
}

export default function TrackTicket() {
  const { id } = useParams<{ id: string }>()
  const [ticket, setTicket] = useState<QueueTicket | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [queuePosition, setQueuePosition] = useState<number | null>(null)
  const printRef = useRef<HTMLDivElement>(null)

  const baseUrl = import.meta.env.VITE_PUBLIC_URL ?? window.location.origin
  const qrValue = id ? `${baseUrl}/track/${id}` : ''

  useEffect(() => {
    if (!id) return
    let cancelled = false
    const fetchTicket = async () => {
      try {
        const t = await getTicketById(id)
        if (cancelled) return

        if (t && (t.status === 'completed' || t.status === 'skipped')) {
          if (pollTimer) clearInterval(pollTimer)
        }

        setTicket(t)

        if (t && t.status === 'waiting') {
          const all = await getQueueList({ status: 'waiting' })
          if (cancelled) return
          const pos = all.findIndex((x) => x.id === t.id)
          setQueuePosition(pos >= 0 ? pos + 1 : null)
        } else {
          setQueuePosition(null)
        }
      } catch {
        if (!cancelled) setError('Tiket tidak ditemukan')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    const pollTimer = setInterval(fetchTicket, 5000)
    fetchTicket()

    return () => {
      cancelled = true
      clearInterval(pollTimer)
    }
  }, [id])

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 size-8 animate-spin text-pln-cyan" />
          <p className="text-muted-foreground">Mencari tiket...</p>
        </div>
      </div>
    )
  }

  if (error || !ticket) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md text-center">
          <AlertCircle className="mx-auto mb-4 size-12 text-destructive" />
          <h1 className="mb-2 text-xl font-bold">Tiket Tidak Ditemukan</h1>
          <p className="mb-6 text-sm text-muted-foreground">
            {error || 'Tiket dengan ID tersebut tidak ada'}
          </p>
          {import.meta.env.DEV && (
            <div className="mb-6 rounded-lg bg-muted px-4 py-3 text-left text-sm">
              <p className="mb-2 font-medium text-foreground">Coba demo tiket:</p>
              <div className="flex flex-wrap gap-2">
                <Link to="/track/ticket-1" className="text-pln-cyan hover:underline">ticket-1 (menunggu)</Link>
                <Link to="/track/ticket-2" className="text-pln-cyan hover:underline">ticket-2 (menunggu)</Link>
                <Link to="/track/ticket-5" className="text-pln-cyan hover:underline">ticket-5 (dipanggil)</Link>
                <Link to="/track/ticket-6" className="text-pln-cyan hover:underline">ticket-6 (dilayani)</Link>
                <Link to="/track/ticket-7" className="text-pln-cyan hover:underline">ticket-7 (selesai)</Link>
                <Link to="/track/ticket-8" className="text-pln-cyan hover:underline">ticket-8 (dilewati)</Link>
              </div>
            </div>
          )}
          <Link
            to="/kiosk"
            className="inline-flex items-center gap-2 text-sm text-pln-cyan hover:underline"
          >
            <ArrowLeft className="size-4" />
            Ambil tiket baru
          </Link>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
        <div className="w-full max-w-md">
          <div className="overflow-hidden rounded-xl bg-card text-center shadow-lg ring-1 ring-pln-cyan/20">
            <div className="h-2 bg-pln-cyan" />
            <div className="p-8">
              <div
                className={`mx-auto mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium ring-1 ${statusColors[ticket.status]}`}
              >
                <span
                  className={`size-2 rounded-full ${ticket.status === 'waiting' ? 'bg-blue-600 animate-pulse' : ticket.status === 'completed' ? 'bg-gray-600' : ticket.status === 'skipped' ? 'bg-red-600' : 'bg-green-600'}`}
                />
                {statusLabels[ticket.status] || ticket.status}
              </div>

              <div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">
                Nomor Antrian
              </div>
              <div className="mb-6 text-5xl font-bold text-pln-cyan">
                {ticket.queueNumber}
              </div>

              <div className="mb-4 text-sm capitalize text-muted-foreground">
                Layanan: {ticket.serviceType}
              </div>

              <div className="mb-6 flex justify-center">
                <div className="inline-block rounded-lg bg-white p-2 ring-1 ring-pln-cyan/20">
                  <QRCodeCanvas value={qrValue} size={140} level="M" />
                </div>
              </div>

              {ticket.status === 'waiting' && queuePosition !== null && (
                <div className="mb-6 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
                  <div className="flex items-center justify-center gap-2 font-medium">
                    <Clock className="size-4" />
                    Posisi Antrian
                  </div>
                  <p className="mt-1">
                    Kamu adalah antrian ke-<strong>{queuePosition}</strong> dari
                    semua yang menunggu
                  </p>
                </div>
              )}

              {ticket.status === 'waiting' && queuePosition === null && (
                <div className="mb-6 rounded-lg bg-pln-cyan/5 px-4 py-3 text-sm text-muted-foreground">
                  Silakan tunggu nomor Anda dipanggil dan menuju ke loket yang ditentukan
                </div>
              )}

              {ticket.status === 'called' && ticket.counterNumber && (
                <div className="mb-6 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800 ring-1 ring-green-200">
                  <CheckCircle2 className="mx-auto mb-1 size-5" />
                  Nomor kamu sedang dipanggil di <strong>Loket {ticket.counterNumber}</strong>
                </div>
              )}

              {ticket.status === 'serving' && ticket.counterNumber && (
                <div className="mb-6 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-800 ring-1 ring-blue-200">
                  <CheckCircle2 className="mx-auto mb-1 size-5" />
                  Sedang dilayani di <strong>Loket {ticket.counterNumber}</strong>
                </div>
              )}

              {ticket.status === 'completed' && (
                <div className="mb-6 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600 ring-1 ring-gray-200">
                  Tiket ini sudah selesai diproses
                </div>
              )}

              {ticket.status === 'skipped' && (
                <div className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200">
                  Tiket ini dilewati. Silakan ambil tiket baru.
                </div>
              )}

              <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                <span>Diambil: {new Date(ticket.createdAt).toLocaleString('id-ID')}</span>
                {ticket.calledAt && (
                  <span>Dipanggil: {new Date(ticket.calledAt).toLocaleString('id-ID')}</span>
                )}
              </div>

              <div className="mt-6 flex justify-center gap-3">
                <Button onClick={handlePrint}>
                  <Printer className="mr-2 size-4" />
                  Cetak Tiket
                </Button>
                <Link to="/kiosk">
                  <Button variant="outline">
                    <ArrowLeft className="mr-2 size-4" />
                    Kembali
                  </Button>
                </Link>
              </div>
            </div>
          </div>
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
