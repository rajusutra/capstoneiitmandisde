// Persistent strip shown across the whole app while a superadmin is
// impersonating an organization's admin, so it's never mistaken for their
// own session. Uses the "warning" status tone — this is exactly the kind of
// state that tone exists for.
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ImpersonationBanner() {
  const { tenant, exitImpersonation } = useAuth();
  const navigate = useNavigate();

  function handleExit() {
    exitImpersonation();
    navigate('/admin');
  }

  return (
    <div className="bg-status-warning/15 border-b border-status-warning/30 text-status-warning px-6 py-2 flex items-center justify-between text-sm font-medium">
      <span>
        🕵️ You are impersonating <b>{tenant?.name}</b> as its admin.
      </span>
      <button onClick={handleExit} className="bg-status-warning/20 hover:bg-status-warning/30 px-3 py-1 rounded-lg">
        Exit impersonation
      </button>
    </div>
  );
}
