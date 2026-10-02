import type { ThemeSettings } from '../types/admin'

export interface ThemePreset {
  id: string
  name: string
  description: string
  primary: string
  accent: string
}

export const THEME_STORAGE_KEY = 'qserve-theme'

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'pln-blue',
    name: 'Biru',
    description: 'Biru tombol default, satu tema dengan halaman lain',
    primary: '#1d4ed8',
    accent: '#22d3ee',
  },
  {
    id: 'pln-corporate',
    name: 'Biru Tua',
    description: 'Biru corporate #093b9e yang lebih dalam',
    primary: '#093b9e',
    accent: '#22d3ee',
  },
  {
    id: 'sky',
    name: 'Biru Cerah',
    description: 'Biru muda terang seperti aksen admin',
    primary: '#0284c7',
    accent: '#67e8f9',
  },
  {
    id: 'toska',
    name: 'Toska',
    description: 'Biru-hijau segar',
    primary: '#0f766e',
    accent: '#5eead4',
  },
  {
    id: 'ungu',
    name: 'Ungu',
    description: 'Ungu modern',
    primary: '#6d28d9',
    accent: '#c4b5fd',
  },
]

export const DEFAULT_THEME: ThemeSettings = {
  presetId: 'pln-blue',
  primary: '#1d4ed8',
  accent: '#22d3ee',
}

export function isValidHex(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value.trim())
}

function clamp(n: number, min = 0, max = 255): number {
  return Math.min(max, Math.max(min, Math.round(n)))
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  }
}

function rgbToHex(r: number, g: number, b: number): string {
  const to = (n: number) => clamp(n).toString(16).padStart(2, '0')
  return `#${to(r)}${to(g)}${to(b)}`
}

/** Gelapkan hex sebesar amount (0-1). dipakai untuk gradient TV/Kiosk. */
export function darkenHex(hex: string, amount = 0.35): string {
  try {
    const { r, g, b } = hexToRgb(hex)
    return rgbToHex(r * (1 - amount), g * (1 - amount), b * (1 - amount))
  } catch {
    return '#1e3a8a'
  }
}

export function lightenHex(hex: string, amount = 0.25): string {
  try {
    const { r, g, b } = hexToRgb(hex)
    return rgbToHex(r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount)
  } catch {
    return '#60a5fa'
  }
}

export function hexToRgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function getPreset(id: string): ThemePreset {
  return THEME_PRESETS.find((p) => p.id === id) ?? THEME_PRESETS[0]
}

export function resolveTheme(settings: ThemeSettings): Required<ThemeSettings> {
  const preset = getPreset(settings.presetId)
  const primary = isValidHex(settings.primary) ? settings.primary : preset.primary
  const accent = isValidHex(settings.accent) ? settings.accent : preset.accent
  return { presetId: settings.presetId || preset.id, primary, accent }
}

/**
 * Terapkan tema ke <html> sebagai CSS vars.
 * Semua halaman (Admin, Kiosk, TV, Login) membaca var ini,
 * jadi ganti tema dari admin langsung terasa di semua device.
 */
export function applyThemeToDocument(settings: ThemeSettings): void {
  if (typeof document === 'undefined') return
  const { primary, accent, presetId } = resolveTheme(settings)
  const primaryDark = darkenHex(primary, 0.38)
  const primaryDeep = darkenHex(primary, 0.55)
  const root = document.documentElement

  root.dataset.theme = presetId
  root.style.setProperty('--theme-primary', primary)
  root.style.setProperty('--theme-primary-dark', primaryDark)
  root.style.setProperty('--theme-primary-deep', primaryDeep)
  root.style.setProperty('--theme-accent', accent)
  root.style.setProperty('--theme-primary-soft', hexToRgba(primary, 0.12))
  root.style.setProperty('--theme-accent-soft', hexToRgba(accent, 0.14))

  // Halaman di luar .admin-theme (Login, Track, tombol umum) pakai --primary/:root.
  root.style.setProperty('--primary', primary)
  root.style.setProperty('--ring', primary)
  root.style.setProperty('--chart-1', primary)
  root.style.setProperty('--color-pln-teal', primary)
  root.style.setProperty('--color-pln-cyan', accent)
  root.style.setProperty('--color-pln-600', primary)
  root.style.setProperty('--color-pln-500', primary)

  // TV Display & Kiosk: warna solid tanpa gradasi — dulu navy pekat #001134, kini biru tema.
  root.style.setProperty('--tv-header', primary)
  root.style.setProperty('--tv-card', primaryDeep)
  root.style.setProperty('--tv-card-solid', primaryDeep)
  root.style.setProperty('--tv-overlay', hexToRgba(primaryDeep, 0.97))

  // Kiosk: samakan keluarga birunya dengan TV, solid tanpa gradasi.
  root.style.setProperty('--kiosk-bg', primary)
  root.style.setProperty('--kiosk-glow', hexToRgba(accent, 0.3))
}

export function readThemeFromStorage(): ThemeSettings | null {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as ThemeSettings
    if (!parsed || typeof parsed !== 'object') return null
    return resolveTheme({
      presetId: String(parsed.presetId ?? DEFAULT_THEME.presetId),
      primary: String(parsed.primary ?? DEFAULT_THEME.primary),
      accent: String(parsed.accent ?? DEFAULT_THEME.accent),
    })
  } catch {
    return null
  }
}

export function saveThemeToStorage(settings: ThemeSettings): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(resolveTheme(settings)))
  } catch {
    /* private mode — abaikan */
  }
}
