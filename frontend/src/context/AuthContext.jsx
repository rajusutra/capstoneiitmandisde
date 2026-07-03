// Stores the logged-in user + tenant + JWT, and persists them in localStorage
// so a page refresh keeps you logged in.
import { createContext, useContext, useState } from 'react';
import axiosClient from '../api/axiosClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user') || 'null'));
  const [tenant, setTenant] = useState(() => JSON.parse(localStorage.getItem('tenant') || 'null'));

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
  }

  const isLoggedIn = Boolean(user && localStorage.getItem('token'));

  return (
    <AuthContext.Provider value={{ user, tenant, isLoggedIn, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
