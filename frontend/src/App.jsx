// Defines all routes. Pages inside <ProtectedRoute> require login.
// A superadmin is sent to the Platform Admin page instead of the org dashboard.
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import ManagerDashboard from './pages/ManagerDashboard';
import ShiftCalendar from './pages/ShiftCalendar';
import EmployeeList from './pages/EmployeeList';
import FatigueReport from './pages/FatigueReport';
import Billing from './pages/Billing';
import PlatformAdmin from './pages/PlatformAdmin';

export default function App() {
  const { isLoggedIn, user } = useAuth();
  const isSuperadmin = user?.role === 'superadmin';

  return (
    <div className="min-h-screen">
      {isLoggedIn && <Navbar />}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              {isSuperadmin ? <Navigate to="/admin" replace /> : <ManagerDashboard />}
            </ProtectedRoute>
          }
        />
        <Route path="/shifts" element={<ProtectedRoute><ShiftCalendar /></ProtectedRoute>} />
        <Route path="/employees" element={<ProtectedRoute><EmployeeList /></ProtectedRoute>} />
        <Route path="/fatigue" element={<ProtectedRoute><FatigueReport /></ProtectedRoute>} />
        <Route path="/billing" element={<ProtectedRoute><Billing /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><PlatformAdmin /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}
