import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { getKioskTextSettings, updateKioskTextSettings } from '../../services/settings'
import type { KioskTextSettings as KioskTextValues } from '../../types/admin'
import { useSettingsStore } from '../../store/settingsStore'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { MonitorSmartphoneIcon, RefreshCwIcon } from 'lucide-react'

const EMPTY: KioskTextValues = {
  welcomeText: '',
  subtitleText: '',
  hintText: '',
  footerText: '',
}

export function KioskTab() {
  const { general } = useSettingsStore()
  const [values, setValues] = useState<KioskTextValues>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchText = useCallback(async () => {
    try {
      const data = await getKioskTextSettings()
      setValues({
        welcomeText: data.welcomeText ?? '',
        subtitleText: data.subtitleText ?? '',
        hintText: data.hintText ?? '',
        footerText: data.footerText ?? '',
      })
    } catch {
      toast.error('Gagal memuat teks kiosk')
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
      await updateKioskTextSettings({
        welcomeText: values.welcomeText.trim(),
        subtitleText: values.subtitleText.trim(),
        hintText: values.hintText.trim(),
        footerText: values.footerText.trim(),
      })
      toast.success('Teks kiosk berhasil disimpan')
    } catch {
      toast.error('Gagal menyimpan teks kiosk')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
          <RefreshCwIcon className="size-4 animate-spin" />
          Memuat pengaturan kiosk…
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MonitorSmartphoneIcon className="size-4 text-muted-foreground" aria-hidden="true" />
            Teks Halaman Kiosk
          </CardTitle>
          <CardDescription>
            Sambutan dan petunjuk yang tampil di layar sentuh kiosk. Logo &amp; nama instansi
            mengikuti tab Identitas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="kiosk-welcome">Teks Sambutan</Label>
              <Input
                id="kiosk-welcome"
                value={values.welcomeText}
                onChange={(e) => setValues((v) => ({ ...v, welcomeText: e.target.value }))}
                placeholder="cth. Selamat Datang di"
                maxLength={80}
              />
            </div>
            <p className="-mt-1 text-[11px] text-muted-foreground">
              Nama besar di bawah sambutan = Nama Instansi pada tab Identitas.
            </p>
            <div className="grid gap-1.5">
              <Label htmlFor="kiosk-subtitle">Sub-instruksi</Label>
              <Input
                id="kiosk-subtitle"
                value={values.subtitleText}
                onChange={(e) => setValues((v) => ({ ...v, subtitleText: e.target.value }))}
                placeholder="cth. Silakan pilih layanan yang Anda butuhkan"
                maxLength={120}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="kiosk-hint">Petunjuk Sentuh</Label>
              <Input
                id="kiosk-hint"
                value={values.hintText}
                onChange={(e) => setValues((v) => ({ ...v, hintText: e.target.value }))}
                placeholder="cth. Sentuh layar untuk mencetak tiket"
                maxLength={60}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="kiosk-footer">Teks Footer</Label>
              <Input
                id="kiosk-footer"
                value={values.footerText}
                onChange={(e) => setValues((v) => ({ ...v, footerText: e.target.value }))}
                placeholder="cth. PT PLN (Persero) · ULP Subang"
                maxLength={120}
              />
            </div>
            <div className="flex justify-end border-t border-border pt-4">
              <Button type="submit" disabled={saving}>
                {saving && <RefreshCwIcon className="animate-spin" data-icon="inline-start" />}
                Simpan Teks Kiosk
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Pratinjau */}
      <Card size="sm" className="self-start">
        <CardHeader>
          <CardTitle className="text-sm">Pratinjau</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center rounded-xl bg-pln-950 px-4 py-6 text-center">
            <img
              src={general?.logoUrl?.trim() || '/assets/logo-pln.png'}
              alt="Logo"
              className="h-12 w-12 rounded-lg object-contain"
            />
            <p className="mt-3 text-xs font-light tracking-wide text-white/90">
              {values.welcomeText || 'Selamat Datang di'}
            </p>
            <p className="mt-0.5 truncate text-lg font-bold text-white">
              {general?.institutionName?.trim() || 'ULP Subang'}
            </p>
            <p className="mt-1 text-[11px] font-medium text-white/80">
              {values.subtitleText || 'Silakan pilih layanan yang Anda butuhkan'}
            </p>
            <span className="mt-2 rounded-full bg-white/10 px-3 py-1 text-[10px] font-medium text-white/70">
              ☝️ {values.hintText || 'Sentuh layar untuk mencetak tiket'}
            </span>
            <p className="mt-3 w-full border-t border-white/15 pt-2 text-[9px] text-white/45">
              {values.footerText || 'PT PLN (Persero) · ULP Subang'}
            </p>
          </div>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            Kartu layanan mengikuti daftar tetap saat ini.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
