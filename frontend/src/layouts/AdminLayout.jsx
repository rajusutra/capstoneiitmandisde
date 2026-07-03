// Sidebar layout for the superadmin area. Replaces the org top-navbar entirely
// for superadmin routes — see App.jsx, which renders this instead of <Navbar/>.
import { NavLink, Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const links = [
  { to: '/admin', label: 'Dashboard', icon: '📊', end: true },
  { to: '/admin/tenants', label: 'Tenants', icon: '🏢' },
  { to: '/admin/users', label: 'Users', icon: '👤' },
  { to: '/admin/subscriptions', label: 'Subscriptions', icon: '💳' },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();

  if (user?.role !== 'superadmin') return <Navigate to="/" replace />;

  return (
    <div className="flex min-h-screen bg-surface">
      <aside className="w-60 bg-surface-card border-r border-white/10 flex flex-col shrink-0">
        <div className="px-5 py-5 border-b border-white/10">
          <p className="font-bold text-lg text-ink">🗓 Shift Planner</p>
          <p className="text-xs text-ink-muted mt-0.5">Platform Admin</p>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                  isActive ? 'bg-accent text-white' : 'text-ink-secondary hover:bg-white/5 hover:text-ink'
                }`
              }
            >
              <span aria-hidden="true">{link.icon}</span>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <p className="text-sm text-ink-secondary truncate">{user?.name}</p>
          <button
            onClick={logout}
            className="mt-2 w-full bg-white/10 hover:bg-white/20 text-ink px-3 py-2 rounded-lg text-sm font-medium"
          >
            Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
