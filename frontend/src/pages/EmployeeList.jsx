// Employees page: list, add and delete employees.
import { useEffect, useState } from 'react';
import axiosClient, { errorMessage } from '../api/axiosClient';
import ActionButton from '../components/ActionButton';

export default function EmployeeList() {
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState({ name: '', employeeCode: '', department: '', maxWeeklyHours: 40 });
  const [error, setError] = useState('');

  async function load() {
    const res = await axiosClient.get('/employees');
    setEmployees(res.data.data);
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  async function handleAdd(e) {
    e.preventDefault();
    setError('');
    try {
      await axiosClient.post('/employees', form);
      setForm({ name: '', employeeCode: '', department: '', maxWeeklyHours: 40 });
      await load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this employee?')) return;
    await axiosClient.delete(`/employees/${id}`);
    await load();
  }

  const inputClass =
    'bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent';

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-ink">Employees</h1>

      {/* Add form */}
      <form onSubmit={handleAdd} className="bg-surface-card border border-white/10 rounded-2xl p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs text-ink-muted block mb-1">Name</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} required />
        </div>
        <div>
          <label className="text-xs text-ink-muted block mb-1">Employee code</label>
          <input
            value={form.employeeCode}
            onChange={(e) => setForm({ ...form, employeeCode: e.target.value })}
            className={inputClass}
            placeholder="EMP-001"
            required
          />
        </div>
        <div>
          <label className="text-xs text-ink-muted block mb-1">Department</label>
          <input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className={inputClass} />
        </div>
        <div>
          <label className="text-xs text-ink-muted block mb-1">Max weekly hours</label>
          <input
            type="number"
            value={form.maxWeeklyHours}
            onChange={(e) => setForm({ ...form, maxWeeklyHours: Number(e.target.value) })}
            className={`${inputClass} w-24`}
            min="1"
            max="100"
          />
        </div>
        <button className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg font-semibold transition">
          Add employee
        </button>
        {error && <p className="text-status-critical text-sm w-full">{error}</p>}
      </form>

      {/* Table */}
      <div className="bg-surface-card border border-white/10 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-ink-muted text-left">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Max weekly hours</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => (
              <tr key={emp.id} className="border-t border-white/10">
                <td className="px-4 py-3 font-medium text-ink">{emp.name}</td>
                <td className="px-4 py-3 text-ink-secondary">{emp.employeeCode}</td>
                <td className="px-4 py-3 text-ink-secondary">{emp.department}</td>
                <td className="px-4 py-3 text-ink-secondary">{emp.maxWeeklyHours}h</td>
                <td className="px-4 py-3 text-right">
                  <ActionButton tone="critical" onClick={() => handleDelete(emp.id)}>
                    Delete
                  </ActionButton>
                </td>
              </tr>
            ))}
            {employees.length === 0 && (
              <tr>
                <td colSpan="5" className="px-4 py-6 text-center text-ink-muted">
                  No employees yet. Add your first one above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
