// All login accounts across every organization (admins/managers — not
// Employees, which have no login). Searchable, paginated.
import { useEffect, useState } from 'react';
import axiosClient, { errorMessage } from '../../api/axiosClient';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    axiosClient
      .get('/admin/users', { params: { page, limit: 20, search } })
      .then((res) => {
        setUsers(res.data.data.users);
        setPages(res.data.data.pages);
        setTotal(res.data.data.total);
      })
      .catch((err) => setError(errorMessage(err)));
  }, [page, search]);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-ink">Users</h1>
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by name or email…"
          className="bg-line/5 border border-line/10 rounded-lg px-3 py-2 w-64 text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </div>

      {error && <p className="text-status-critical bg-status-critical/10 p-3 rounded-lg">{error}</p>}

      <div className="bg-surface-card border border-line/10 rounded-2xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-line/5 text-ink-muted text-left">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Organization</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-line/10">
                <td className="px-4 py-3 font-medium text-ink">{u.name}</td>
                <td className="px-4 py-3 text-ink-secondary">{u.email}</td>
                <td className="px-4 py-3 text-ink-secondary">{u.tenantName}</td>
                <td className="px-4 py-3 capitalize text-ink-secondary">{u.role}</td>
                <td className="px-4 py-3 text-ink-secondary">{new Date(u.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan="5" className="px-4 py-6 text-center text-ink-muted">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-ink-secondary">
        <span>{total} users total</span>
        <div className="flex items-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1 border border-line/10 rounded-lg disabled:opacity-40 hover:border-accent/50"
          >
            Prev
          </button>
          <span>Page {page} of {pages}</span>
          <button
            disabled={page >= pages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1 border border-line/10 rounded-lg disabled:opacity-40 hover:border-accent/50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
