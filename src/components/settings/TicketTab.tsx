import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { getTicketTextSettings, updateTicketTextSettings } from '../../services/settings'
import type { TicketTextSettings as TicketTextValues } from '../../types/admin'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { RefreshCwIcon, TicketIcon } from 'lucide-react'

const EMPTY: TicketTextValues = {
  headerText: '',
  subHeaderText: '',
  footerMessage: '',
}

export function TicketTab() {
  const [values, setValues] = useState<TicketTextValues>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchText = useCallback(async () => {
    try {
      const data = await getTicketTextSettings()
      setValues({
        headerText: data.headerText ?? '',
        subHeaderText: data.subHeaderText ?? '',
        footerMessage: data.footerMessage ?? '',
      })
    } catch {
      toast.error('Gagal memuat teks tiket')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => void fetchText(), 0)
    return () => window.clearTimeout(timer)
  }, [fetchText])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await updateTicketTextSettings({
        headerText: values.headerText.trim(),
        subHeaderText: values.subHeaderText.trim(),
        footerMessage: values.footerMessage.trim(),
      })
      toast.success('Teks tiket berhasil disimpan')
    } catch {
      toast.error('Gagal menyimpan teks tiket')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
          <RefreshCwIcon className="size-4 animate-spin" />
          Memuat pengaturan tiket…
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TicketIcon className="size-4 text-muted-foreground" aria-hidden="true" />
            Teks Tiket Kiosk
          </CardTitle>
          <CardDescription>
            Teks ini tampil pada tiket yang dicetak/ditampilkan setelah pengambilan antrian.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="ticket-header">Judul Utama</Label>
              <Input
                id="ticket-header"
                value={values.headerText}
                onChange={(e) => setValues((v) => ({ ...v, headerText: e.target.value }))}
                placeholder="cth. NOMOR ANTRIAN"
                maxLength={60}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ticket-sub">Subjudul</Label>
              <Input
                id="ticket-sub"
                value={values.subHeaderText}
                onChange={(e) => setValues((v) => ({ ...v, subHeaderText: e.target.value }))}
                placeholder="cth. Nomor antrian Anda"
                maxLength={80}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ticket-footer">Pesan Kaki Tiket</Label>
              <textarea
                id="ticket-footer"
                value={values.footerMessage}
                onChange={(e) => setValues((v) => ({ ...v, footerMessage: e.target.value }))}
                placeholder="cth. Terima kasih telah mengambil tiket."
                rows={3}
                maxLength={200}
                className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>
            <div className="flex justify-end border-t border-border pt-4">
              <Button type="submit" disabled={saving}>
                {saving && <RefreshCwIcon className="animate-spin" data-icon="inline-start" />}
                Simpan Teks Tiket
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Pratinjau tiket */}
      <Card size="sm" className="self-start">
        <CardHeader>
          <CardTitle className="text-sm">Pratinjau</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-dashed border-border bg-card px-4 py-6 text-center">
            <div className="truncate text-xs font-bold tracking-widest uppercase">
              {values.headerText || 'NOMOR ANTRIAN'}
            </div>
            <div className="mt-1 truncate text-[11px] text-muted-foreground">
              {values.subHeaderText || 'Nomor antrian Anda'}
            </div>
            <div className="my-3 border-t border-dashed border-border" />
            <div className="text-4xl font-bold tabular-nums tracking-wider text-foreground">
              G-001
            </div>
            <div className="mt-2 border-t border-dashed border-border" />
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground italic">
              {values.footerMessage || 'Terima kasih telah mengambil tiket.'}
            </p>
          </div>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            Nomor dan layanan tetap otomatis dari sistem.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
