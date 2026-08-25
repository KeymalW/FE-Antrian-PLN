import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useSettingsStore } from '../../store/settingsStore'
import { uploadLogo } from '../../services/settings'
import { BRANDING } from '../../lib/branding'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Building2Icon, ImageIcon, LinkIcon, RefreshCwIcon, RotateCcwIcon, UploadIcon } from 'lucide-react'

export function IdentityTab() {
  const { general, saveGeneral, setGeneral } = useSettingsStore()
  const [institutionName, setInstitutionName] = useState('')
  const [logoUrl, setLogoUrl] = useState(BRANDING.logos.admin)
  const [logoInput, setLogoInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!general) return
      setInstitutionName(general.institutionName ?? '')
      if (general.logoUrl) {
        setLogoUrl(general.logoUrl)
        setLogoInput(general.logoUrl.startsWith('data:') ? '' : general.logoUrl)
      }
    }, 0)
    return () => window.clearTimeout(timer)
  }, [general])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const updated = await uploadLogo(file)
      setGeneral(updated)
      setLogoUrl(updated.logoUrl)
      setLogoInput(updated.logoUrl.startsWith('data:') ? '' : updated.logoUrl)
      toast.success('Logo berhasil diupload')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal mengupload logo')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveGeneral({
        institutionName: institutionName.trim() || BRANDING.app.name,
        logoUrl,
      })
      toast.success('Identitas instansi berhasil disimpan')
    } catch {
      toast.error('Gagal menyimpan identitas')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2Icon className="size-4 text-muted-foreground" aria-hidden="true" />
            Identitas Instansi
          </CardTitle>
          <CardDescription>
            Nama dan logo ini tampil di sidebar admin dan dapat diubah kapan saja.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-1.5">
            <Label htmlFor="identity-name">Nama Instansi / Aplikasi</Label>
            <Input
              id="identity-name"
              value={institutionName}
              onChange={(e) => setInstitutionName(e.target.value)}
              placeholder="cth. PLN ULP Subang"
            />
          </div>

          <div className="grid gap-1.5">
            <Label>Logo</Label>
            <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-muted/30 p-4">
              <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-card ring-1 ring-border">
                <img src={logoUrl} alt="Preview logo" className="max-h-14 max-w-14 object-contain" />
              </div>
              <div className="flex min-w-0 flex-1 flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <RefreshCwIcon className="animate-spin" data-icon="inline-start" />
                  ) : (
                    <UploadIcon data-icon="inline-start" />
                  )}
                  Upload Gambar
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setLogoUrl(BRANDING.logos.admin)
                    setLogoInput('')
                  }}
                >
                  <RotateCcwIcon data-icon="inline-start" />
                  Kembali ke Default
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  className="hidden"
                  onChange={handleUpload}
                />
              </div>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="identity-logo-url">
              <ImageIcon className="size-3.5 text-muted-foreground" aria-hidden="true" />
              Atau gunakan URL gambar
            </Label>
            <div className="flex gap-2">
              <Input
                id="identity-logo-url"
                value={logoInput}
                onChange={(e) => setLogoInput(e.target.value)}
                placeholder="https://contoh.com/logo.png"
              />
              <Button
                type="button"
                variant="outline"
                disabled={!logoInput.trim()}
                onClick={() => setLogoUrl(logoInput.trim())}
              >
                <LinkIcon data-icon="inline-start" />
                Pakai
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              PNG/JPG/SVG/WebP, maksimal 512KB untuk file upload. Klik Simpan untuk menerapkan.
            </p>
          </div>

          <div className="flex justify-end border-t border-border pt-4">
            <Button onClick={() => void handleSave()} disabled={saving}>
              {saving && <RefreshCwIcon className="animate-spin" data-icon="inline-start" />}
              Simpan Identitas
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
