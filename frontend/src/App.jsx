// Defines all routes. Pages inside <ProtectedRoute> require login.
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

export default function App() {
  const { isLoggedIn } = useAuth();

  return (
    <div className="min-h-screen">
      {isLoggedIn && <Navbar />}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<ProtectedRoute><ManagerDashboard /></ProtectedRoute>} />
        <Route path="/shifts" element={<ProtectedRoute><ShiftCalendar /></ProtectedRoute>} />
        <Route path="/employees" element={<ProtectedRoute><EmployeeList /></ProtectedRoute>} />
        <Route path="/fatigue" element={<ProtectedRoute><FatigueReport /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}
