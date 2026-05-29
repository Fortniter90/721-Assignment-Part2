import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Car } from 'lucide-react';
import BookingPage from './pages/BookingPage';
import AdminPage from './pages/AdminPage';
import DriverPage from './pages/DriverPage';
import QueryPage from './pages/QueryPage';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
        <nav className="bg-slate-950 shadow-lg border-b border-amber-500">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <Car className="w-8 h-8 text-amber-400" />
              <span className="text-2xl font-bold text-white">Cabs Online</span>
            </Link>
            <div className="flex gap-6">
              <Link to="/" className="text-gray-300 hover:text-amber-400 font-medium transition-colors">
                Book a Cab
              </Link>
              <Link to="/track" className="text-gray-300 hover:text-amber-400 font-medium transition-colors">
                Track Booking
              </Link>
              <Link to="/driver" className="text-gray-300 hover:text-amber-400 font-medium transition-colors">
                Driver Portal
              </Link>
              <Link to="/admin" className="text-gray-300 hover:text-amber-400 font-medium transition-colors">
                Admin
              </Link>
            </div>
          </div>
        </nav>

        <Routes>
          <Route path="/" element={<BookingPage />} />
          <Route path="/track" element={<QueryPage />} />
          <Route path="/driver" element={<DriverPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
