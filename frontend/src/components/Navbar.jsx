// Top navigation bar shown on all pages after login.
// Superadmins see only the Platform Admin link; org users see the normal pages.
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const orgLinks = [
  { to: '/', label: 'Dashboard' },
  { to: '/shifts', label: 'Shift Calendar' },
  { to: '/employees', label: 'Employees' },
  { to: '/fatigue', label: 'Fatigue Report' },
  { to: '/billing', label: 'Billing' },
];

const superadminLinks = [{ to: '/admin', label: 'Platform Admin' }];

export default function Navbar() {
  const { user, tenant, logout } = useAuth();
  const location = useLocation();

  const links = user?.role === 'superadmin' ? superadminLinks : orgLinks;

  return (
    <nav className="bg-slate-800 text-white px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <span className="font-bold text-lg">🗓 Shift Planner</span>
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className={`text-sm hover:text-blue-300 ${
              location.pathname === link.to ? 'text-blue-400 font-semibold' : 'text-slate-200'
            }`}
          >
            {link.label}
          </Link>
        ))}
      </div>
      <div className="flex items-center gap-4 text-sm">
        <span className="text-slate-300">
          {user?.name} · {tenant?.name}
        </span>
        <button onClick={logout} className="bg-slate-600 hover:bg-slate-500 px-3 py-1 rounded">
          Logout
        </button>
      </div>
    </nav>
  );
}
