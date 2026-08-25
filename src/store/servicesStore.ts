import { create } from 'zustand'
import { getServices } from '../services/serviceCatalog'
import { setDynamicServices } from '../lib/serviceTypes'
import type { ServiceDefinition } from '../types/admin'

/** Cadangan bila backend gagal dijangkau — meniru 3 layanan bawaan. */
export const FALLBACK_SERVICES: ServiceDefinition[] = [
  { id: 'legacy-pengaduan', name: 'Pengaduan', code: 'pengaduan', prefix: 'G', counterNumber: 1, icon: 'megaphone', serviceGroup: 'group_a', isActive: true, showInKiosk: true },
  { id: 'legacy-pbpd', name: 'PB/PD/Migrasi', code: 'pb_pd_migrasi', prefix: 'M', counterNumber: 2, icon: 'plug-zap', serviceGroup: 'group_a', isActive: true, showInKiosk: true },
  { id: 'legacy-p2tl', name: 'P2TL', code: 'p2tl', prefix: 'T', counterNumber: 3, icon: 'wrench', serviceGroup: 'group_b', isActive: true, showInKiosk: true },
]

interface ServicesState {
  services: ServiceDefinition[]
  loaded: boolean
  fetchServices: () => Promise<void>
}

export const useServicesStore = create<ServicesState>((set) => ({
  services: FALLBACK_SERVICES,
  loaded: false,

  fetchServices: async () => {
    try {
      const list = await getServices()
      setDynamicServices(list)
      if (list.length > 0) {
        set({ services: list, loaded: true })
      } else {
        // Daftar kosong tetap sah — fallback dipertahankan agar
        // label tiket lama tetap terbaca.
        set({ loaded: true })
      }
    } catch {
      // Backend gagal: biarkan fallback, coba lagi pada pemanggilan berikutnya.
      set({ services: FALLBACK_SERVICES })
    }
  },
}))
