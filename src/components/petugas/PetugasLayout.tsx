import { useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { LogOutIcon } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useSettingsStore } from '../../store/settingsStore'
import { logout as logoutApi } from '../../services/auth'
import { BRANDING } from '../../lib/branding'
import { PageTransition } from '../layout/PageTransition'

export function PetugasLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const { general, fetchGeneral } = useSettingsStore()

  useEffect(() => {
    void fetchGeneral()
  }, [fetchGeneral])

  const logoUrl = general?.logoUrl?.trim() || BRANDING.logos.admin
  const appName = general?.institutionName?.trim()

  const handleLogout = async () => {
    try {
      await logoutApi()
    } catch {
      toast.error('Gagal logout dari server')
    }
    logout()
    navigate('/login')
  }

  return (
    <div className="admin-theme min-h-screen bg-background">
      {/* Header tipis — logo instansi kiri, identitas petugas kanan */}
      <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-card/85 px-4 backdrop-blur sm:px-6 relative">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-blue-600"
          aria-hidden="true"
        />
        <div className="flex min-w-0 items-center gap-3">
          <img
            key={logoUrl}
            src={logoUrl}
            alt="Logo instansi"
            className="h-8 w-auto max-w-[8rem] object-contain"
            onError={(e) => {
              const img = e.currentTarget
              if (img.dataset.fallback) return
              img.dataset.fallback = '1'
              img.src = BRANDING.logos.admin
            }}
          />
          {appName && (
            <span className="hidden truncate text-sm font-semibold text-foreground sm:block">
              {appName}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden text-right leading-tight sm:block">
            <div className="text-xs font-medium text-foreground">{user?.name}</div>
            <div className="text-[11px] capitalize text-muted-foreground">
              Petugas{user?.counterNumber ? ` • Loket ${user.counterNumber}` : ''}
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Keluar"
            className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOutIcon className="size-4" />
          </button>
        </div>
      </header>

      <main className="px-4 py-6 sm:px-6 lg:px-8">
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>
    </div>
  )
}
