import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  BarChart3Icon,
  ClipboardListIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  MenuIcon,
  SettingsIcon,
  UsersIcon,
  XIcon,
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useSettingsStore } from '../../store/settingsStore'
import { logout as logoutApi } from '../../services/auth'
import type { User } from '../../types/auth'
import { BRANDING } from '../../lib/branding'
import { cn } from '../../lib/utils'
import { PageTransition } from '../layout/PageTransition'

const NAV_ITEMS = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboardIcon, end: true },
  { to: '/admin/reports', label: 'Laporan', icon: BarChart3Icon, end: false },
  { to: '/admin/services', label: 'Kelola Layanan', icon: ClipboardListIcon, end: false },
  { to: '/admin/accounts', label: 'Kelola Akun', icon: UsersIcon, end: false },
  { to: '/admin/settings', label: 'Pengaturan', icon: SettingsIcon, end: false },
] as const

function getInitials(name: string | undefined) {
  if (!name) return '?'
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

interface SidebarContentProps {
  user: User | null
  onLogout: () => void
  onNavigate?: () => void
}

function SidebarContent({ user, onLogout, onNavigate }: SidebarContentProps) {
  const { general } = useSettingsStore()
  const logoUrl = general?.logoUrl?.trim() || BRANDING.logos.admin
  const appName = general?.institutionName?.trim()

  return (
    <>
      {/* Logo + nama instansi — diatur di Pengaturan › Identitas */}
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-border px-5">
        <img
          key={logoUrl}
          src={logoUrl}
          alt="Logo instansi"
          className="h-9 w-auto max-w-[5.5rem] shrink-0 object-contain"
          onError={(e) => {
            const img = e.currentTarget
            if (img.dataset.fallback) return
            img.dataset.fallback = '1'
            img.src = BRANDING.logos.admin
          }}
        />
        {appName && (
          <span className="min-w-0 truncate text-sm leading-tight font-semibold text-foreground">
            {appName}
          </span>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pt-4">
        <p className="mb-2 px-3 text-[11px] font-medium tracking-widest text-muted-foreground uppercase">
          Menu
        </p>
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-accent font-medium text-foreground'
                  : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  className={cn(
                    'size-4 shrink-0',
                    isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                  )}
                  aria-hidden="true"
                />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="shrink-0 border-t border-border p-3">
        <div className="mb-2 flex items-center gap-3 rounded-lg bg-muted/60 px-3 py-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-card text-xs font-semibold text-foreground ring-1 ring-border">
            {getInitials(user?.name)}
          </div>
          <div className="min-w-0">
            <div className="truncate text-xs font-medium text-foreground">{user?.name}</div>
            <div className="truncate text-[11px] capitalize text-muted-foreground">
              {user?.role}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOutIcon className="size-4 shrink-0" aria-hidden="true" />
          Keluar
        </button>
      </div>
    </>
  )
}

export function AdminLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const fetchGeneral = useSettingsStore((state) => state.fetchGeneral)

  useEffect(() => {
    void fetchGeneral()
  }, [fetchGeneral])

  useEffect(() => {
    if (!sidebarOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [sidebarOpen])

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
      {/* Sidebar — desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-card lg:flex">
        <SidebarContent user={user} onLogout={handleLogout} />
      </aside>

      {/* Tombol menu — mobile/tablet (menggantikan topbar) */}
      <button
        type="button"
        aria-label="Buka menu"
        onClick={() => setSidebarOpen(true)}
        className="fixed top-3 left-3 z-30 flex size-9 items-center justify-center rounded-lg bg-card text-muted-foreground shadow-sm ring-1 ring-border transition-colors hover:bg-accent hover:text-foreground lg:hidden"
      >
        <MenuIcon className="size-5" />
      </button>

      {/* Sidebar — mobile drawer */}
      <div
        className={cn(
          'fixed inset-0 z-40 lg:hidden',
          sidebarOpen ? 'pointer-events-auto' : 'pointer-events-none'
        )}
      >
        <div
          role="presentation"
          onClick={() => setSidebarOpen(false)}
          className={cn(
            'absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-200',
            sidebarOpen ? 'opacity-100' : 'opacity-0'
          )}
        />
        <aside
          className={cn(
            'absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col border-r border-border bg-card shadow-xl transition-transform duration-200',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <button
            type="button"
            aria-label="Tutup menu"
            onClick={() => setSidebarOpen(false)}
            className="absolute top-4 right-3 flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <XIcon className="size-4" />
          </button>
          <SidebarContent
            user={user}
            onLogout={handleLogout}
            onNavigate={() => setSidebarOpen(false)}
          />
        </aside>
      </div>

      {/* Content area */}
      <main className="min-h-screen px-4 pt-16 pb-6 sm:px-6 lg:ml-64 lg:px-8 lg:pt-6">
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>
    </div>
  )
}
