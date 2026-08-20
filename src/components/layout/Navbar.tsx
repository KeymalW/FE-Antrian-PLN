import { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuthStore } from '../../store/authStore'
import { Button } from '../ui/button'
import { logout as logoutApi } from '../../services/auth'
import { getRoleHome } from '../../lib/roles'
import { QServeLogo } from './QServeLogo'

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [showPlnLogo, setShowPlnLogo] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => setShowPlnLogo((prev) => !prev), 10000)
    return () => clearInterval(timer)
  }, [])

  const isActive = (path: string) =>
    location.pathname === path || (path !== '/' && location.pathname.startsWith(path))

  const handleLogout = async () => {
    try {
      await logoutApi()
    } catch {
      toast.error('Gagal logout dari server')
    }
    logout()
    navigate('/login')
  }

  const roleHome = user ? getRoleHome(user.role) : '/login'

  return (
    <nav className="flex h-14 items-center justify-between border-b border-[#D7E7F5] bg-[#F1F7FC] px-6 shadow-[0_1px_4px_rgba(30,79,138,0.06)]">
      <div className="flex items-center gap-6">
        <Link to="/" className="flex items-center gap-1.5 no-underline">
          <span className="relative block h-8 w-12">
            <QServeLogo
              className={`h-8 w-auto transition-opacity duration-700 ${showPlnLogo ? 'opacity-0' : 'opacity-100'}`}
            />
            <img
              src="/assets/logo-pln.png"
              alt="PLN"
              className={`absolute top-1/2 left-1/2 h-8 w-auto -translate-x-1/2 -translate-y-1/2 object-contain transition-opacity duration-700 ${showPlnLogo ? 'opacity-100' : 'opacity-0'}`}
            />
          </span>
          <span className="text-lg font-bold leading-none tracking-tight text-[#093b9e]">
            QServe
          </span>
        </Link>
        <div className="flex items-center gap-4 text-sm">
          {isAuthenticated && user?.role === 'kiosk' && (
            <Link to="/kiosk" className={`no-underline ${isActive('/kiosk') ? 'font-medium text-[#1E4F8A]' : 'text-[#1E4F8A]/60 hover:text-[#1E4F8A]'}`}>
              Kiosk
            </Link>
          )}
          {isAuthenticated && (
            <Link to={roleHome} className={`no-underline ${isActive(roleHome) ? 'font-medium text-[#1E4F8A]' : 'text-[#1E4F8A]/60 hover:text-[#1E4F8A]'}`}>
              Dashboard
            </Link>
          )}
          {isAuthenticated && user?.role === 'tvdisplay' && (
            <Link to="/monitor" className={`no-underline ${isActive('/monitor') ? 'font-medium text-[#1E4F8A]' : 'text-[#1E4F8A]/60 hover:text-[#1E4F8A]'}`}>
              Monitor
            </Link>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {isAuthenticated ? (
          <>
            <span className="text-sm text-[#1E4F8A]/80">
              {user?.name} ({user?.role})
            </span>
            <Button variant="default" size="sm" className="!border-[#D7E7F5] bg-white text-[#093b9e] hover:bg-white/90" onClick={handleLogout}>
              Logout
            </Button>
          </>
        ) : location.pathname !== '/login' ? (
          <Link to="/login">
            <Button variant="default" size="sm" className="!border-[#D7E7F5] bg-white text-[#093b9e] hover:bg-white/90">
              Login
            </Button>
          </Link>
        ) : null}
      </div>
    </nav>
  )
}