// Employees page: list, add, edit and delete employees. The employee code is
// auto-generated (EMP-001, EMP-002, ...) rather than typed in. Each row also
// shows the fatigue risk of that employee's most recently assigned shift.
import { useEffect, useMemo, useState } from 'react';
import axiosClient, { errorMessage } from '../api/axiosClient';
import StatusBadge from '../components/StatusBadge';
import ActionButton from '../components/ActionButton';

const RISK_TONE = { low: 'good', medium: 'warning', high: 'critical' };
const emptyForm = { name: '', department: '', maxWeeklyHours: 40 };

function nextEmployeeCode(list) {
  const numbers = list
    .map((e) => /^EMP-(\d+)$/.exec(e.employeeCode || ''))
    .filter(Boolean)
    .map((m) => parseInt(m[1], 10));
  const next = numbers.length ? Math.max(...numbers) + 1 : 1;
  return `EMP-${String(next).padStart(3, '0')}`;
}

export default function EmployeeList() {
  const [employees, setEmployees] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [assessments, setAssessments] = useState({}); // shiftId -> assessment result (or { error: true })
  const [seeded, setSeeded] = useState(false);

  const inputClass =
    'bg-line/5 border border-line/10 rounded-lg px-3 py-2 text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent';

  async function load() {
    const [empRes, shiftRes] = await Promise.all([
      axiosClient.get('/employees'),
      axiosClient.get('/shifts'),
    ]);
    setEmployees(empRes.data.data);
    setShifts(shiftRes.data.data);
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  // Seed the cache from existing assessment history (once, on mount) so
  // revisiting this page doesn't re-POST /fatigue/assess for a shift that
  // already has a result — that was creating a fresh duplicate audit row on
  // every page load instead of reusing the one that's still valid.
  useEffect(() => {
    axiosClient
      .get('/fatigue/assessments')
      .then((res) => {
        const latestByShift = {};
        for (const a of res.data.data) {
          if (!(a.shiftId in latestByShift)) latestByShift[a.shiftId] = a;
        }
        setAssessments((prev) => ({ ...latestByShift, ...prev }));
      })
      .catch(console.error)
      .finally(() => setSeeded(true));
  }, []);

  const autoCode = useMemo(() => nextEmployeeCode(employees), [employees]);

  // Each employee's most recently assigned shift, keyed by employeeId.
  const lastShiftByEmployee = useMemo(() => {
    const map = {};
    for (const s of shifts) {
      const current = map[s.employeeId];
      if (!current || new Date(s.createdAt) > new Date(current.createdAt)) map[s.employeeId] = s;
    }
    return map;
  }, [shifts]);

  // Auto-assess each employee's last-assigned shift in the background so the
  // "Final assessment" column fills itself in — no manual trigger needed.
  useEffect(() => {
    if (!seeded) return;
    const targets = Object.values(lastShiftByEmployee).filter((s) => !(s.id in assessments));
    if (targets.length === 0) return;

    let cancelled = false;
    (async () => {
      for (const shift of targets) {
        try {
          const res = await axiosClient.post(`/fatigue/assess/${shift.id}`);
          if (cancelled) return;
          setAssessments((prev) => ({ ...prev, [shift.id]: res.data.data }));
        } catch (err) {
          if (cancelled) return;
          setAssessments((prev) => ({ ...prev, [shift.id]: { error: true } }));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastShiftByEmployee, seeded]);

  async function handleAdd(e) {
    e.preventDefault();
    setError('');
    setAdding(true);
    try {
      await axiosClient.post('/employees', { ...form, employeeCode: nextEmployeeCode(employees) });
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setAdding(false);
    }
  }

  function startEdit(emp) {
    setEditingId(emp.id);
    setEditForm({ name: emp.name, department: emp.department, maxWeeklyHours: emp.maxWeeklyHours });
  }

  async function handleSaveEdit(id) {
    setError('');
    setSavingId(id);
    try {
      await axiosClient.put(`/employees/${id}`, editForm);
      setEditingId(null);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this employee?')) return;
    await axiosClient.delete(`/employees/${id}`);
    if (editingId === id) setEditingId(null);
    await load();
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-ink">Employees</h1>

      {/* Add form */}
      <form onSubmit={handleAdd} className="bg-surface-card border border-line/10 rounded-2xl p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs text-ink-muted block mb-1">Name</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} required />
        </div>
        <div>
          <label className="text-xs text-ink-muted block mb-1">Employee code</label>
          <input
            value={autoCode}
            readOnly
            title="Auto-generated — assigned automatically when you add the employee"
            className={`${inputClass} w-28 text-ink-muted cursor-not-allowed`}
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
        <button disabled={adding} className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg font-semibold transition disabled:opacity-50">
          {adding ? 'Adding…' : 'Add employee'}
        </button>
        {error && <p className="text-status-critical text-sm w-full">{error}</p>}
      </form>

      {/* Table */}
      <div className="bg-surface-card border border-line/10 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-line/5 text-ink-muted text-left">
            <tr>
              <th className="px-4 py-3 whitespace-nowrap">Name</th>
              <th className="px-4 py-3 whitespace-nowrap">Code</th>
              <th className="px-4 py-3 whitespace-nowrap">Department</th>
              <th className="px-4 py-3 whitespace-nowrap">Max weekly hours</th>
              <th className="px-4 py-3 whitespace-nowrap">Final assessment</th>
              <th className="px-4 py-3 text-right whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => {
              const isEditing = editingId === emp.id;
              const lastShift = lastShiftByEmployee[emp.id];
              const assessment = lastShift && assessments[lastShift.id];

              if (isEditing) {
                return (
                  <tr key={emp.id} className="border-t border-line/10 bg-accent/5">
                    <td className="px-4 py-2">
                      <input
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className={`${inputClass} w-full`}
                      />
                    </td>
                    <td className="px-4 py-3 text-ink-muted whitespace-nowrap">{emp.employeeCode}</td>
                    <td className="px-4 py-2">
                      <input
                        value={editForm.department}
                        onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                        className={`${inputClass} w-full`}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={editForm.maxWeeklyHours}
                        onChange={(e) => setEditForm({ ...editForm, maxWeeklyHours: Number(e.target.value) })}
                        className={`${inputClass} w-24`}
                      />
                    </td>
                    <td className="px-4 py-3 text-ink-muted text-xs whitespace-nowrap">—</td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <div className="flex gap-2 justify-end">
                        <ActionButton tone="good" onClick={() => handleSaveEdit(emp.id)} disabled={savingId === emp.id}>
                          {savingId === emp.id ? 'Saving…' : 'Save'}
                        </ActionButton>
                        <ActionButton tone="neutral" onClick={() => setEditingId(null)}>Cancel</ActionButton>
                        <ActionButton tone="critical" onClick={() => handleDelete(emp.id)}>Delete</ActionButton>
                      </div>
                    </td>
                  </tr>
                );
              }

              return (
                <tr key={emp.id} className="border-t border-line/10 hover:bg-line/5 transition">
                  <td className="px-4 py-3 font-medium text-ink whitespace-nowrap">{emp.name}</td>
                  <td className="px-4 py-3 text-ink-secondary whitespace-nowrap">{emp.employeeCode}</td>
                  <td className="px-4 py-3 text-ink-secondary whitespace-nowrap">{emp.department}</td>
                  <td className="px-4 py-3 text-ink-secondary whitespace-nowrap">{emp.maxWeeklyHours}h</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {!lastShift && <span className="text-ink-muted text-xs">No shifts</span>}
                    {lastShift && !assessment && <span className="text-ink-muted text-xs">Checking…</span>}
                    {lastShift && assessment?.error && <span className="text-status-critical text-xs">Assess failed</span>}
                    {lastShift && assessment && !assessment.error && (
                      <StatusBadge tone={RISK_TONE[assessment.riskLevel]} label={`${assessment.riskLevel} · ${assessment.riskScore}`} />
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex gap-2 justify-end">
                      <ActionButton tone="neutral" onClick={() => startEdit(emp)}>Edit</ActionButton>
                      <ActionButton tone="critical" onClick={() => handleDelete(emp.id)}>Delete</ActionButton>
                    </div>
                  </td>
                </tr>
              );
            })}
            {employees.length === 0 && (
              <tr>
                <td colSpan="6" className="px-4 py-6 text-center text-ink-muted">
                  No employees yet. Add your first one above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
