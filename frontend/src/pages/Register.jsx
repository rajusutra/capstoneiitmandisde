// Registration page: creates a new tenant (organization) + its first admin user.
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { errorMessage } from '../api/axiosClient';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ tenantName: '', name: '', email: '', password: '' });
  const [error, setError] = useState('');

  function update(field, value) {
    setForm({ ...form, [field]: value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await register(form.tenantName, form.name, form.email, form.password);
      navigate('/');
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <form onSubmit={handleSubmit} className="bg-surface-card border border-line/10 p-8 rounded-2xl w-96 space-y-4">
        <h1 className="text-2xl font-bold text-center text-ink">Create your organization</h1>
        <p className="text-sm text-ink-muted text-center">You will become its first admin</p>

        {error && <p className="text-status-critical text-sm bg-status-critical/10 p-2 rounded-lg">{error}</p>}

        <input
          placeholder="Organization name (e.g. City Hospital)"
          value={form.tenantName}
          onChange={(e) => update('tenantName', e.target.value)}
          className="w-full bg-line/5 border border-line/10 rounded-lg px-3 py-2 text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent"
          required
        />
        <input
          placeholder="Your name"
          value={form.name}
          onChange={(e) => update('name', e.target.value)}
          className="w-full bg-line/5 border border-line/10 rounded-lg px-3 py-2 text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent"
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => update('email', e.target.value)}
          className="w-full bg-line/5 border border-line/10 rounded-lg px-3 py-2 text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent"
          required
        />
        <input
          type="password"
          placeholder="Password (min 6 characters)"
          value={form.password}
          onChange={(e) => update('password', e.target.value)}
          className="w-full bg-line/5 border border-line/10 rounded-lg px-3 py-2 text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent"
          required
        />
        <button className="w-full bg-accent hover:bg-accent-hover text-white py-2 rounded-lg font-semibold transition">
          Register
        </button>

        <p className="text-sm text-center text-ink-muted">
          Already have an account?{' '}
          <Link to="/login" className="text-accent hover:underline">
            Log in
          </Link>
        </p>
      </form>
    </div>
  );
}
