// Shift Calendar: shifts grouped by day + a form to add new ones.
// Each shift has an "Assess" button that runs the AI fatigue check.
import { useEffect, useState } from 'react';
import axiosClient, { errorMessage } from '../api/axiosClient';
import StatusBadge from '../components/StatusBadge';
import ActionButton from '../components/ActionButton';

const RISK_TONE = { low: 'good', medium: 'warning', high: 'critical' };

export default function ShiftCalendar() {
  const [shifts, setShifts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState({ employeeId: '', date: '', start: '09:00', end: '17:00', shiftType: 'morning' });
  const [error, setError] = useState('');
  const [assessment, setAssessment] = useState(null); // result popup for the last assessed shift
  const [assessingId, setAssessingId] = useState(null);

  const inputClass =
    'bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-ink focus:outline-none focus:ring-2 focus:ring-accent';

  async function load() {
    const [shiftRes, empRes] = await Promise.all([
      axiosClient.get('/shifts'),
      axiosClient.get('/employees'),
    ]);
    setShifts(shiftRes.data.data);
    setEmployees(empRes.data.data);
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  async function handleAdd(e) {
    e.preventDefault();
    setError('');
    try {
      await axiosClient.post('/shifts', {
        employeeId: form.employeeId,
        startTime: `${form.date}T${form.start}:00`,
        endTime: `${form.date}T${form.end}:00`,
        shiftType: form.shiftType,
      });
      await load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this shift?')) return;
    await axiosClient.delete(`/shifts/${id}`);
    await load();
  }

  async function handleAssess(id) {
    setAssessingId(id);
    setAssessment(null);
    try {
      const res = await axiosClient.post(`/fatigue/assess/${id}`);
      setAssessment(res.data.data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setAssessingId(null);
    }
  }

  // Group shifts by calendar day for a simple "calendar" view
  const byDay = {};
  for (const shift of shifts) {
    const day = new Date(shift.startTime).toDateString();
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(shift);
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-ink">Shift Calendar</h1>

      {/* Add shift form */}
      <form onSubmit={handleAdd} className="bg-surface-card border border-white/10 rounded-2xl p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs text-ink-muted block mb-1">Employee</label>
          <select
            value={form.employeeId}
            onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
            className={inputClass}
            required
          >
            <option value="" className="bg-surface-card">Select...</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id} className="bg-surface-card">{emp.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-ink-muted block mb-1">Date</label>
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputClass} required />
        </div>
        <div>
          <label className="text-xs text-ink-muted block mb-1">Start</label>
          <input type="time" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} className={inputClass} required />
        </div>
        <div>
          <label className="text-xs text-ink-muted block mb-1">End</label>
          <input type="time" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} className={inputClass} required />
        </div>
        <div>
          <label className="text-xs text-ink-muted block mb-1">Type</label>
          <select value={form.shiftType} onChange={(e) => setForm({ ...form, shiftType: e.target.value })} className={inputClass}>
            <option value="morning" className="bg-surface-card">Morning</option>
            <option value="evening" className="bg-surface-card">Evening</option>
            <option value="night" className="bg-surface-card">Night</option>
            <option value="custom" className="bg-surface-card">Custom</option>
          </select>
        </div>
        <button className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg font-semibold transition">
          Add shift
        </button>
        {error && <p className="text-status-critical text-sm w-full">{error}</p>}
      </form>

      {/* Assessment result panel */}
      {assessment && (
        <div className="bg-surface-card border border-white/10 border-l-4 border-l-accent rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-3">
            <StatusBadge tone={RISK_TONE[assessment.riskLevel]} label={`${assessment.riskLevel} risk`} />
            <span className="text-ink-muted text-sm">Score: {assessment.riskScore}/100</span>
            <button onClick={() => setAssessment(null)} className="ml-auto text-ink-muted hover:text-ink">✕</button>
          </div>
          <p className="text-sm text-ink-secondary">{assessment.aiExplanation}</p>
          <p className="text-sm text-ink-secondary"><b className="text-ink">Suggestion:</b> {assessment.suggestedAlternative}</p>
        </div>
      )}

      {/* Shifts grouped by day */}
      {Object.keys(byDay).length === 0 && (
        <p className="text-ink-muted text-center py-8">No shifts yet. Add your first one above.</p>
      )}
      {Object.entries(byDay).map(([day, dayShifts]) => (
        <div key={day} className="bg-surface-card border border-white/10 rounded-2xl p-4">
          <h2 className="font-semibold text-ink mb-3">{day}</h2>
          <div className="space-y-2">
            {dayShifts.map((shift) => (
              <div key={shift.id} className="flex items-center gap-4 border border-white/10 rounded-xl px-4 py-2">
                <span className="font-medium text-ink w-40">{shift.employeeName}</span>
                <span className="text-sm text-ink-secondary">
                  {new Date(shift.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {' – '}
                  {new Date(shift.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="text-xs bg-white/10 text-ink-secondary px-2 py-1 rounded-md capitalize">{shift.shiftType}</span>
                <div className="ml-auto flex gap-2">
                  <ActionButton tone="accent" onClick={() => handleAssess(shift.id)} disabled={assessingId === shift.id}>
                    {assessingId === shift.id ? 'Assessing…' : 'Assess'}
                  </ActionButton>
                  <ActionButton tone="critical" onClick={() => handleDelete(shift.id)}>
                    Delete
                  </ActionButton>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
