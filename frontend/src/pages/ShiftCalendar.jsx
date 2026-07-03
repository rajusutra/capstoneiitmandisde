// Shift Calendar: shifts grouped by day + a form to add new ones.
// Each shift has an "Assess" button that runs the AI fatigue check.
import { useEffect, useState } from 'react';
import axiosClient, { errorMessage } from '../api/axiosClient';

const levelColors = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-red-100 text-red-700',
};

export default function ShiftCalendar() {
  const [shifts, setShifts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState({ employeeId: '', date: '', start: '09:00', end: '17:00', shiftType: 'morning' });
  const [error, setError] = useState('');
  const [assessment, setAssessment] = useState(null); // result popup for the last assessed shift
  const [assessingId, setAssessingId] = useState(null);

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
      <h1 className="text-2xl font-bold">Shift Calendar</h1>

      {/* Add shift form */}
      <form onSubmit={handleAdd} className="bg-white rounded-xl shadow p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs text-gray-500 block">Employee</label>
          <select value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
            className="border rounded px-3 py-2" required>
            <option value="">Select...</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>{emp.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 block">Date</label>
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
            className="border rounded px-3 py-2" required />
        </div>
        <div>
          <label className="text-xs text-gray-500 block">Start</label>
          <input type="time" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })}
            className="border rounded px-3 py-2" required />
        </div>
        <div>
          <label className="text-xs text-gray-500 block">End</label>
          <input type="time" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })}
            className="border rounded px-3 py-2" required />
        </div>
        <div>
          <label className="text-xs text-gray-500 block">Type</label>
          <select value={form.shiftType} onChange={(e) => setForm({ ...form, shiftType: e.target.value })}
            className="border rounded px-3 py-2">
            <option value="morning">Morning</option>
            <option value="evening">Evening</option>
            <option value="night">Night</option>
            <option value="custom">Custom</option>
          </select>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-semibold">
          Add shift
        </button>
        {error && <p className="text-red-600 text-sm w-full">{error}</p>}
      </form>

      {/* Assessment result panel */}
      {assessment && (
        <div className="bg-white rounded-xl shadow p-4 border-l-4 border-blue-500 space-y-2">
          <div className="flex items-center gap-3">
            <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${levelColors[assessment.riskLevel]}`}>
              {assessment.riskLevel} risk
            </span>
            <span className="text-gray-500 text-sm">Score: {assessment.riskScore}/100</span>
            <button onClick={() => setAssessment(null)} className="ml-auto text-gray-400 hover:text-gray-600">✕</button>
          </div>
          <p className="text-sm text-gray-700">{assessment.aiExplanation}</p>
          <p className="text-sm text-gray-700"><b>Suggestion:</b> {assessment.suggestedAlternative}</p>
        </div>
      )}

      {/* Shifts grouped by day */}
      {Object.keys(byDay).length === 0 && (
        <p className="text-gray-400 text-center py-8">No shifts yet. Add your first one above.</p>
      )}
      {Object.entries(byDay).map(([day, dayShifts]) => (
        <div key={day} className="bg-white rounded-xl shadow p-4">
          <h2 className="font-semibold text-gray-700 mb-3">{day}</h2>
          <div className="space-y-2">
            {dayShifts.map((shift) => (
              <div key={shift.id} className="flex items-center gap-4 border rounded-lg px-4 py-2">
                <span className="font-medium w-40">{shift.employeeName}</span>
                <span className="text-sm text-gray-600">
                  {new Date(shift.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {' – '}
                  {new Date(shift.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded capitalize">{shift.shiftType}</span>
                <div className="ml-auto flex gap-2">
                  <button
                    onClick={() => handleAssess(shift.id)}
                    disabled={assessingId === shift.id}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm px-3 py-1 rounded"
                  >
                    {assessingId === shift.id ? 'Assessing…' : 'Assess'}
                  </button>
                  <button onClick={() => handleDelete(shift.id)} className="text-red-500 text-sm hover:underline">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
