// Top navigation bar for organization users (managers/admins/employees).
// Superadmins never see this — they get the sidebar in layouts/AdminLayout.jsx.
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';

const links = [
  { to: '/', label: 'Dashboard' },
  { to: '/shifts', label: 'Shift Calendar' },
  { to: '/employees', label: 'Employees' },
  { to: '/fatigue', label: 'Fatigue Report' },
  { to: '/billing', label: 'Billing' },
];

export default function Navbar() {
  const { user, tenant, logout } = useAuth();
  const location = useLocation();

  return (
    <nav className="bg-surface-card border-b border-line/10 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <span className="font-bold text-lg text-ink">🗓 Shift Planner</span>
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className={`text-sm transition ${
              location.pathname === link.to ? 'text-accent font-semibold' : 'text-ink-secondary hover:text-ink'
            }`}
          >
            {link.label}
          </Link>
        ))}
      </div>
      <div className="flex items-center gap-4 text-sm">
        <span className="text-ink-muted">
          {user?.name} · {tenant?.name}
        </span>
        <ThemeToggle />
        <button onClick={logout} className="bg-line/10 hover:bg-line/20 text-ink px-3 py-1.5 rounded-lg">
          Logout
        </button>
      </div>
    </nav>
  );
}
