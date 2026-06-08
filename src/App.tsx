import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import { TicketIcon, ShieldAlertIcon, MonitorPlayIcon } from 'lucide-react'
import { AppLayout } from './components/layout/AppLayout'
import { ProtectedRoute } from './components/layout/ProtectedRoute'
import { Card, CardHeader, CardTitle, CardDescription } from './components/ui/card'
import { Toaster } from './components/ui/sonner'
import Kiosk from './pages/Kiosk'
import AdminDashboard from './pages/AdminDashboard'
import MonitorTV from './pages/MonitorTV'
import Login from './pages/Login'
import TrackTicket from './pages/TrackTicket'

const cards = [
  {
    to: '/kiosk',
    icon: TicketIcon,
    title: 'Kiosk Mandiri',
    desc: 'Ambil tiket antrian untuk berbagai layanan PLN',
    bg: 'bg-pln-cyan/10 group-hover:bg-pln-cyan/20',
    iconColor: 'text-pln-cyan',
    ringColor: 'ring-pln-cyan/30 hover:ring-pln-cyan/50',
  },
  {
    to: '/admin',
    icon: ShieldAlertIcon,
    title: 'Dashboard',
    desc: 'Kelola antrian, panggil nomor, dan pantau statistik real-time',
    bg: 'bg-pln-cyan/10 group-hover:bg-pln-cyan/20',
    iconColor: 'text-pln-cyan',
    ringColor: 'ring-pln-cyan/30 hover:ring-pln-cyan/50',
  },
  {
    to: '/monitor',
    icon: MonitorPlayIcon,
    title: 'Tampilan TV',
    desc: 'Pantau antrian secara langsung di layar monitor besar',
    bg: 'bg-pln-cyan/10 group-hover:bg-pln-cyan/20',
    iconColor: 'text-pln-cyan',
    ringColor: 'ring-pln-cyan/30 hover:ring-pln-cyan/50',
  },
]

function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <h1 className="mb-2 text-4xl font-bold">Sistem Antrian PLN</h1>
      <p className="mb-10 text-lg text-muted-foreground">
        Pilih halaman untuk melanjutkan
      </p>
      <div className="grid w-full max-w-3xl grid-cols-1 gap-6 sm:grid-cols-3">
        {cards.map((c) => {
          const Icon = c.icon
          return (
            <Link key={c.to} to={c.to}>
              <Card
                className={`group cursor-pointer text-center transition-all duration-300 hover:scale-105 hover:shadow-lg ${c.ringColor}`}
              >
                <div className="flex justify-center pt-2">
                  <div
                    className={`flex size-14 items-center justify-center rounded-full transition-colors ${c.bg}`}
                  >
                    <Icon className={`size-7 ${c.iconColor}`} />
                  </div>
                </div>
                <CardHeader className="items-center gap-1">
                  <CardTitle>{c.title}</CardTitle>
                  <CardDescription>{c.desc}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/kiosk" element={<Kiosk />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={['admin', 'petugas']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
        </Route>
        <Route path="/monitor" element={<MonitorTV />} />
        <Route path="/track/:id" element={<TrackTicket />} />
      </Routes>
      <Toaster />
    </Router>
  )
}
