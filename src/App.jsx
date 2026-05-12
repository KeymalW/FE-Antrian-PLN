import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Kiosk from './pages/Kiosk';
import AdminDashboard from './pages/AdminDashboard';
import MonitorTV from './pages/MonitorTV';
import './App.css';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <nav className="bg-white shadow-md p-4 mb-6">
          <ul className="flex gap-6 justify-center">
            <li><Link to="/kiosk" className="text-blue-600 hover:underline">Kiosk (Ambil Tiket)</Link></li>
            <li><Link to="/admin" className="text-blue-600 hover:underline">Admin Dashboard</Link></li>
            <li><Link to="/monitor" className="text-blue-600 hover:underline">Monitor TV</Link></li>
          </ul>
        </nav>

        <div className="container mx-auto">
          <Routes>
            <Route path="/" element={
              <div className="text-center p-10">
                <h1 className="text-3xl font-bold mb-4">Sistem Antrian PLN</h1>
                <p>Pilih halaman di atas untuk mulai, sayang~ ✨</p>
              </div>
            } />
            <Route path="/kiosk" element={<Kiosk />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/monitor" element={<MonitorTV />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
