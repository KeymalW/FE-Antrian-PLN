import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { ProtectedRoute } from './components/layout/ProtectedRoute'
import { Toaster } from './components/ui/sonner'
import Kiosk from './pages/Kiosk'
import AdminDashboard from './pages/AdminDashboard'
import AdminSettings from './pages/AdminSettings'
import PetugasDashboard from './pages/PetugasDashboard'
import MonitorTV from './pages/MonitorTV'
import Login from './pages/Login'
import TrackTicket from './pages/TrackTicket'
import NotFound from './pages/NotFound'
import { NetworkStatus } from './components/ui/NetworkStatus'
import { PageTransition } from './components/layout/PageTransition'
import { useAuthStore } from './store/authStore'
import { getRoleHome } from './lib/roles'

function HomeRedirect() {
  const { isAuthenticated, user } = useAuthStore()

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />
  }

  return <Navigate to={getRoleHome(user.role)} replace />
}

export default function App() {
  return (
    <Router>
      <NetworkStatus />
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={['admin']}>
                <Outlet />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
          <Route
            path="/petugas"
            element={
              <ProtectedRoute roles={['petugas']}>
                <PetugasDashboard />
              </ProtectedRoute>
            }
          />
        </Route>
        <Route
          path="/kiosk"
          element={
            <ProtectedRoute roles={['kiosk']}>
              <Kiosk />
            </ProtectedRoute>
          }
        />
        <Route
          path="/monitor"
          element={
            <ProtectedRoute roles={['tvdisplay']}>
              <MonitorTV />
            </ProtectedRoute>
          }
        />
        <Route path="/track/:id" element={<PageTransition><TrackTicket /></PageTransition>} />
        <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
      </Routes>
      <Toaster />
    </Router>
  )
}