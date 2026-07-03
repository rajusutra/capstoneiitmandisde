// Stores the logged-in user + tenant + JWT, and persists them in localStorage
// so a page refresh keeps you logged in. Also handles impersonation: a
// superadmin can temporarily swap into an organization's admin session while
// keeping their own session backed up to restore later.
import { createContext, useContext, useState } from 'react';
import axiosClient from '../api/axiosClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user') || 'null'));
  const [tenant, setTenant] = useState(() => JSON.parse(localStorage.getItem('tenant') || 'null'));
  const [isImpersonating, setIsImpersonating] = useState(() => localStorage.getItem('isImpersonating') === 'true');

  function saveSession(data) {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    localStorage.setItem('tenant', JSON.stringify(data.tenant));
    setUser(data.user);
    setTenant(data.tenant);
  }

  async function login(email, password) {
    const res = await axiosClient.post('/auth/login', { email, password });
    saveSession(res.data.data);
  }

  async function register(tenantName, name, email, password) {
    const res = await axiosClient.post('/auth/register', { tenantName, name, email, password });
    saveSession(res.data.data);
  }

  function logout() {
    localStorage.clear();
    setUser(null);
    setTenant(null);
    setIsImpersonating(false);
  }

  // Swaps the active session to an impersonated org admin, backing up the
  // superadmin's own session first so exitImpersonation() can restore it.
  function startImpersonation(data) {
    const backup = {
      token: localStorage.getItem('token'),
      user: localStorage.getItem('user'),
      tenant: localStorage.getItem('tenant'),
    };
    localStorage.setItem('superadminBackup', JSON.stringify(backup));
    localStorage.setItem('isImpersonating', 'true');
    setIsImpersonating(true);
    saveSession(data);
  }

  // Restores the superadmin's own session. Falls back to a full logout if
  // the backup is somehow missing, rather than leaving a half-swapped state.
  function exitImpersonation() {
    const raw = localStorage.getItem('superadminBackup');
    const backup = raw ? JSON.parse(raw) : null;
    if (!backup || !backup.token) {
      logout();
      return;
    }
    localStorage.setItem('token', backup.token);
    localStorage.setItem('user', backup.user);
    localStorage.setItem('tenant', backup.tenant);
    localStorage.removeItem('superadminBackup');
    localStorage.removeItem('isImpersonating');
    setUser(JSON.parse(backup.user));
    setTenant(JSON.parse(backup.tenant));
    setIsImpersonating(false);
  }

  const isLoggedIn = Boolean(user && localStorage.getItem('token'));

  return (
    <AuthContext.Provider
      value={{ user, tenant, isLoggedIn, isImpersonating, login, register, logout, startImpersonation, exitImpersonation }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
