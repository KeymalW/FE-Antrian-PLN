import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useThemeStore } from '../../store/themeStore'
import { DEFAULT_THEME, THEME_PRESETS, darkenHex, isValidHex } from '../../lib/theme'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card'
import { Button } from '../ui/button'
import { Label } from '../ui/label'
import { PaletteIcon, RefreshCwIcon, RotateCcwIcon, CheckIcon } from 'lucide-react'
import { cn } from '../../lib/utils'

export function ThemeTab() {
  const { theme, loading, fetchTheme, saveTheme, applyLocal } = useThemeStore()
  const [primary, setPrimary] = useState(theme.primary)
  const [accent, setAccent] = useState(theme.accent)
  const [presetId, setPresetId] = useState(theme.presetId)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchTheme()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [fetchTheme])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPrimary(theme.primary)
      setAccent(theme.accent)
      setPresetId(theme.presetId)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [theme.primary, theme.accent, theme.presetId])

  const handlePreset = (id: string) => {
    const preset = THEME_PRESETS.find((p) => p.id === id)
    if (!preset) return
    setPresetId(preset.id)
    setPrimary(preset.primary)
    setAccent(preset.accent)
    // Live preview ke semua halaman tanpa simpan dulu.
    applyLocal({ presetId: preset.id, primary: preset.primary, accent: preset.accent })
  }

  const handleCustomColor = (key: 'primary' | 'accent', value: string) => {
    if (key === 'primary') setPrimary(value)
    else setAccent(value)
    setPresetId('custom')
    if (isValidHex(value)) {
      applyLocal({ presetId: 'custom', primary: key === 'primary' ? value : primary, accent: key === 'accent' ? value : accent })
    }
  }

  const handleSave = async () => {
    if (!isValidHex(primary) || !isValidHex(accent)) {
      toast.error('Warna belum valid, pilih ulang warna')
      return
    }
    setSaving(true)
    try {
      await saveTheme({ presetId, primary, accent })
      toast.success('Tema warna berhasil disimpan — berlaku di semua halaman & device')
    } catch {
      toast.error('Gagal menyimpan tema')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    setSaving(true)
    try {
      setPresetId(DEFAULT_THEME.presetId)
      setPrimary(DEFAULT_THEME.primary)
      setAccent(DEFAULT_THEME.accent)
      await saveTheme({ ...DEFAULT_THEME })
      toast.success('Tema dikembalikan ke default Biru')
    } catch {
      toast.error('Gagal mereset tema')
    } finally {
      setSaving(false)
    }
  }

  const previewDark = darkenHex(isValidHex(primary) ? primary : DEFAULT_THEME.primary, 0.45)

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PaletteIcon className="size-4 text-muted-foreground" aria-hidden="true" />
            Tema Warna
          </CardTitle>
          <CardDescription>
            Satu tema untuk semua halaman — TV Display, Kiosk, Admin, Petugas, dan Login.
            Biru navy pekat TV sudah diganti ke biru tombol agar seragam.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <Label className="mb-2 block text-sm font-medium">Preset</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {THEME_PRESETS.map((preset) => {
                const active = presetId === preset.id && primary === preset.primary && accent === preset.accent
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handlePreset(preset.id)}
                    className={cn(
                      'flex flex-col items-start gap-2 rounded-xl border p-3 text-left transition-all hover:shadow-sm',
                      active ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-ring',
                    )}
                  >
                    <span className="flex w-full gap-1.5">
                      <span
                        className="h-8 flex-1 rounded-md"
                        style={{ background: preset.primary }}
                      />
                      <span
                        className="h-8 w-8 rounded-md"
                        style={{ background: preset.accent }}
                      />
                    </span>
                    <span className="flex w-full items-center justify-between text-xs font-semibold">
                      {preset.name}
                      {active && <CheckIcon className="size-3.5 text-primary" />}
                    </span>
                    <span className="text-[11px] leading-tight text-muted-foreground">
                      {preset.description}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid gap-4 rounded-xl border border-border p-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Warna Utama (biru tombol & header TV)</Label>
              <div className="flex items-center gap-3">
                <input
                  id="theme-primary-picker"
                  type="color"
                  value={isValidHex(primary) ? primary : DEFAULT_THEME.primary}
                  onChange={(e) => handleCustomColor('primary', e.target.value)}
                  className="h-10 w-16 cursor-pointer rounded-md border border-border bg-card p-1"
                  aria-label="Pilih warna utama"
                />
                <span className="flex items-center gap-2 text-sm">
                  <span
                    className="inline-block size-5 rounded-md ring-1 ring-border"
                    style={{ background: isValidHex(primary) ? primary : DEFAULT_THEME.primary }}
                  />
                  <span className="font-mono uppercase text-muted-foreground">
                    {isValidHex(primary) ? primary.toUpperCase() : DEFAULT_THEME.primary.toUpperCase()}
                  </span>
                </span>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Warna Aksen (angka antrian & highlight)</Label>
              <div className="flex items-center gap-3">
                <input
                  id="theme-accent-picker"
                  type="color"
                  value={isValidHex(accent) ? accent : DEFAULT_THEME.accent}
                  onChange={(e) => handleCustomColor('accent', e.target.value)}
                  className="h-10 w-16 cursor-pointer rounded-md border border-border bg-card p-1"
                  aria-label="Pilih warna aksen"
                />
                <span className="flex items-center gap-2 text-sm">
                  <span
                    className="inline-block size-5 rounded-md ring-1 ring-border"
                    style={{ background: isValidHex(accent) ? accent : DEFAULT_THEME.accent }}
                  />
                  <span className="font-mono uppercase text-muted-foreground">
                    {isValidHex(accent) ? accent.toUpperCase() : DEFAULT_THEME.accent.toUpperCase()}
                  </span>
                </span>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground sm:col-span-2">
              Pilih preset atau geser pemilih warna untuk custom. Perubahan langsung
              terlihat (preview) sebelum disimpan permanen ke semua device.
              {loading && ' • Memuat tema tersimpan…'}
            </p>
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="ghost" onClick={() => void handleReset()} disabled={saving}>
              <RotateCcwIcon data-icon="inline-start" />
              Reset Default
            </Button>
            <Button type="button" onClick={() => void handleSave()} disabled={saving}>
              {saving && <RefreshCwIcon className="animate-spin" data-icon="inline-start" />}
              Simpan Tema
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Pratinjau */}
      <Card size="sm" className="self-start">
        <CardHeader>
          <CardTitle className="text-sm">Pratinjau</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div
            className="overflow-hidden rounded-xl text-center"
            style={{ background: primary }}
          >
            <div className="px-4 py-3 text-xs font-semibold tracking-widest text-white/80">
              TV DISPLAY
            </div>
            <div className="mx-3 mb-3 rounded-lg bg-black/25 px-3 py-4">
              <div className="text-[10px] tracking-widest text-white/60">NOMOR PANGGILAN</div>
              <div className="text-4xl font-bold" style={{ color: accent }}>
                G-001
              </div>
            </div>
          </div>
          <div
            className="rounded-xl px-4 py-4 text-center"
            style={{ background: primary }}
          >
            <div className="text-xs text-white/80">Kiosk</div>
            <div className="mx-auto mt-2 w-fit rounded-full bg-white px-4 py-1.5 text-xs font-bold" style={{ color: previewDark }}>
              Ambil Tiket
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-8 flex-1 rounded-md text-center text-[11px] font-semibold leading-8 text-white" style={{ background: primary }}>
              Tombol
            </span>
            <span className="h-8 w-12 rounded-md" style={{ background: accent }} />
          </div>
          <p className="text-center text-[11px] text-muted-foreground">
            Berlaku di TV, Kiosk, Admin, Petugas, Login.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
