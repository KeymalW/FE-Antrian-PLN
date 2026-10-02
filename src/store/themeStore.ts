import { create } from 'zustand'
import { getThemeSettings, updateThemeSettings } from '../services/settings'
import { applyThemeToDocument, DEFAULT_THEME, readThemeFromStorage } from '../lib/theme'
import type { ThemeSettings } from '../types/admin'

interface ThemeState {
  theme: ThemeSettings
  loading: boolean
  fetchTheme: () => Promise<void>
  saveTheme: (patch: Partial<ThemeSettings>) => Promise<void>
  applyLocal: (patch: Partial<ThemeSettings>) => void
}

function initialTheme(): ThemeSettings {
  // Terapkan cache lokal dulu agar TV/Kiosk tidak kedip navy saat load.
  const cached = readThemeFromStorage()
  const theme = cached ?? { ...DEFAULT_THEME }
  try {
    applyThemeToDocument(theme)
  } catch {
    /* SSR / test — abaikan */
  }
  return theme
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: initialTheme(),
  loading: false,

  fetchTheme: async () => {
    set({ loading: true })
    try {
      const theme = await getThemeSettings()
      set({ theme })
      applyThemeToDocument(theme)
    } finally {
      set({ loading: false })
    }
  },

  saveTheme: async (patch) => {
    const merged: ThemeSettings = { ...get().theme, ...patch }
    // Optimistic: langsung terapkan agar preview terasa instan.
    applyThemeToDocument(merged)
    set({ theme: merged })
    try {
      const saved = await updateThemeSettings(patch)
      set({ theme: saved })
      applyThemeToDocument(saved)
    } catch {
      // service sudah fallback ke localStorage, jadi biarkan tema lokal.
    }
  },

  applyLocal: (patch) => {
    const merged: ThemeSettings = { ...get().theme, ...patch }
    set({ theme: merged })
    applyThemeToDocument(merged)
  },
}))
