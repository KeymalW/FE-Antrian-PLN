import { Link, useNavigate, useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuthStore } from '../../store/authStore'
import { Button } from '../ui/button'
import { logout as logoutApi } from '../../services/auth'
import { getRoleHome } from '../../lib/roles'
import { PLNLogo } from './PLNLogo'

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

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
    <nav className="flex h-14 items-center justify-between bg-pln-teal px-6">
      <div className="flex items-center gap-6">
        <Link to="/" className="flex items-center gap-1.5 no-underline">
          <PLNLogo className="size-8" />
          <span className="text-lg font-bold leading-none tracking-tight text-white">
            PLN
          </span>
        </Link>
        <div className="flex items-center gap-4 text-sm">
          {isAuthenticated && user?.role === 'kiosk' && (
            <Link to="/kiosk" className={`no-underline ${isActive('/kiosk') ? 'font-medium text-white' : 'text-white/70 hover:text-white'}`}>
              Kiosk
            </Link>
          )}
          {isAuthenticated && (
            <Link to={roleHome} className={`no-underline ${isActive(roleHome) ? 'font-medium text-white' : 'text-white/70 hover:text-white'}`}>
              Dashboard
            </Link>
          )}
          {isAuthenticated && user?.role === 'tvdisplay' && (
            <Link to="/monitor" className={`no-underline ${isActive('/monitor') ? 'font-medium text-white' : 'text-white/70 hover:text-white'}`}>
              Monitor
            </Link>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {isAuthenticated ? (
          <>
            <span className="text-sm text-white/70">
              {user?.name} ({user?.role})
            </span>
            <Button variant="secondary" size="sm" onClick={handleLogout}>
              Logout
            </Button>
          </>
        ) : location.pathname !== '/login' ? (
          <Link to="/login">
            <Button variant="secondary" size="sm">
              Login
            </Button>
          </Link>
        ) : null}
      </div>
    </nav>
  )
}