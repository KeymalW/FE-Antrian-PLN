import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from './components/layout/ProtectedRoute'
import { AdminLayout } from './components/admin/AdminLayout'
import { PetugasLayout } from './components/petugas/PetugasLayout'
import { Toaster } from './components/ui/sonner'
import Kiosk from './pages/Kiosk'
import AdminDashboard from './pages/AdminDashboard'
import AdminSettings from './pages/AdminSettings'
import AdminReports from './pages/AdminReports'
import AdminAccounts from './pages/AdminAccounts'
import AdminServices from './pages/AdminServices'
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
        {/* Admin — layout sendiri, tanpa navbar lama */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={['admin']}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="services" element={<AdminServices />} />
          <Route path="accounts" element={<AdminAccounts />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>

        <Route
          path="/petugas"
          element={
            <ProtectedRoute roles={['petugas']}>
              <PetugasLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<PetugasDashboard />} />
        </Route>

        {/* Redirect beranda sesuai role */}
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
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