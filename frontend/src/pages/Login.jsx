// Login page.
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { errorMessage } from '../api/axiosClient';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <form onSubmit={handleSubmit} className="bg-surface-card border border-white/10 p-8 rounded-2xl w-96 space-y-4">
        <h1 className="text-2xl font-bold text-center text-ink">🗓 Shift Planner</h1>
        <p className="text-sm text-ink-muted text-center">Log in to your organization</p>

        {error && <p className="text-status-critical text-sm bg-status-critical/10 p-2 rounded-lg">{error}</p>}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent"
          required
        />
        <button className="w-full bg-accent hover:bg-accent-hover text-white py-2 rounded-lg font-semibold transition">
          Log in
        </button>

        <p className="text-sm text-center text-ink-muted">
          New organization?{' '}
          <Link to="/register" className="text-accent hover:underline">
            Register here
          </Link>
        </p>
      </form>
    </div>
  );
}
