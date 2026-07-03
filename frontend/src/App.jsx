// Defines all routes. Pages inside <ProtectedRoute> require login.
// Superadmins get their own sidebar layout (AdminLayout) with nested routes
// instead of the org top-navbar + single page.
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import ImpersonationBanner from './components/ImpersonationBanner';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLayout from './layouts/AdminLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import ManagerDashboard from './pages/ManagerDashboard';
import ShiftCalendar from './pages/ShiftCalendar';
import EmployeeList from './pages/EmployeeList';
import FatigueReport from './pages/FatigueReport';
import Billing from './pages/Billing';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminTenants from './pages/admin/AdminTenants';
import AdminUsers from './pages/admin/AdminUsers';
import AdminSubscriptions from './pages/admin/AdminSubscriptions';

export default function App() {
  const { isLoggedIn, user, isImpersonating } = useAuth();
  const isSuperadmin = user?.role === 'superadmin';

  return (
    <div className="min-h-screen">
      {isLoggedIn && isImpersonating && <ImpersonationBanner />}
      {isLoggedIn && !isSuperadmin && <Navbar />}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Superadmin area — own sidebar layout, no top navbar */}
        <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
          <Route index element={<AdminDashboard />} />
          <Route path="tenants" element={<AdminTenants />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="subscriptions" element={<AdminSubscriptions />} />
        </Route>

        {/* Organization area */}
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

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}
