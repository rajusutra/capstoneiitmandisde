// Shifts page: pick an employee, then every action for that employee
// (add / edit / delete) happens inside one unified table. Fatigue risk is
// assessed automatically in the background — no manual "Assess" click.
import { useEffect, useMemo, useState } from 'react';
import axiosClient, { errorMessage } from '../api/axiosClient';
import StatusBadge from '../components/StatusBadge';
import ActionButton from '../components/ActionButton';

const RISK_TONE = { low: 'good', medium: 'warning', high: 'critical' };
const SHIFT_TYPES = ['morning', 'evening', 'night', 'custom'];
const emptyForm = { date: '', start: '09:00', end: '17:00', shiftType: 'morning' };

function toDateInput(iso) {
  return new Date(iso).toISOString().slice(0, 10);
}
function toTimeInput(iso) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function formatDate(iso) {
  return new Date(iso).toLocaleDateString([], { weekday: 'short', day: '2-digit', month: 'short' });
}
function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ShiftCalendar() {
  const [shifts, setShifts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [addForm, setAddForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [assessments, setAssessments] = useState({}); // shiftId -> last assessment result (or { error: true })
  const [savingId, setSavingId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [showOtherShifts, setShowOtherShifts] = useState(false);
  const [seeded, setSeeded] = useState(false);

  const inputClass =
    'w-full bg-line/5 border border-line/10 rounded-lg px-2 py-1.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent';

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

  // Seed the cache from each shift's existing assessment history (once, on
  // mount) so revisiting this page doesn't re-POST /fatigue/assess for shifts
  // that already have a result — that was creating a fresh duplicate audit
  // row on every page load instead of reusing the one that's still valid.
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

  const selectedEmployee = employees.find((emp) => emp.id === selectedEmployeeId);
  const employeeShifts = useMemo(
    () => shifts.filter((s) => s.employeeId === selectedEmployeeId),
    [shifts, selectedEmployeeId]
  );

  // Auto-assess: as soon as a shift shows up for the selected employee (new,
  // edited, or just loaded) and isn't in the cache yet, assess it in the
  // background. No manual "Assess" button needed.
  useEffect(() => {
    if (!selectedEmployeeId || !seeded) return;
    const pending = employeeShifts.filter((s) => !(s.id in assessments));
    if (pending.length === 0) return;

    let cancelled = false;
    (async () => {
      for (const shift of pending) {
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
  }, [employeeShifts, selectedEmployeeId, seeded]);

  // The fatigue engine scores a shift relative to the employee's OTHER shifts
  // (rest hours before it, 7-day rolling total, overlaps) — so adding,
  // editing, or deleting one shift can change what the correct score is for
  // the rest of that employee's shifts too. Clear all of them so the
  // auto-assess effect re-checks every one, not just the shift that changed.
  function invalidateEmployeeAssessments(employeeId) {
    const ids = shifts.filter((s) => s.employeeId === employeeId).map((s) => s.id);
    setAssessments((prev) => {
      const next = { ...prev };
      for (const id of ids) delete next[id];
      return next;
    });
  }

  function selectEmployee(id) {
    setSelectedEmployeeId(id);
    setError('');
    setEditingId(null);
    setAddForm(emptyForm);
    setShowOtherShifts(false);
  }

  async function handleAdd() {
    setError('');
    setAdding(true);
    try {
      await axiosClient.post('/shifts', {
        employeeId: selectedEmployeeId,
        startTime: `${addForm.date}T${addForm.start}:00`,
        endTime: `${addForm.date}T${addForm.end}:00`,
        shiftType: addForm.shiftType,
      });
      setAddForm(emptyForm);
      invalidateEmployeeAssessments(selectedEmployeeId); // a new shift can change siblings' rest/weekly-hours math
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setAdding(false);
    }
  }

  function startEdit(shift) {
    setEditingId(shift.id);
    setEditForm({
      date: toDateInput(shift.startTime),
      start: toTimeInput(shift.startTime),
      end: toTimeInput(shift.endTime),
      shiftType: shift.shiftType,
    });
  }

  async function handleSaveEdit(id) {
    setError('');
    setSavingId(id);
    try {
      await axiosClient.put(`/shifts/${id}`, {
        startTime: `${editForm.date}T${editForm.start}:00`,
        endTime: `${editForm.date}T${editForm.end}:00`,
        shiftType: editForm.shiftType,
      });
      setEditingId(null);
      invalidateEmployeeAssessments(selectedEmployeeId); // times changed — this and siblings' scores may differ now
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this shift?')) return;
    await axiosClient.delete(`/shifts/${id}`);
    invalidateEmployeeAssessments(selectedEmployeeId); // one fewer shift changes siblings' rest/weekly-hours math too
    if (editingId === id) setEditingId(null);
    await load();
  }

  async function handleReassessAll() {
    setError('');
    const targets = employeeShifts;
    setAssessments((prev) => {
      const next = { ...prev };
      targets.forEach((s) => delete next[s.id]);
      return next;
    });
    for (const shift of targets) {
      try {
        const res = await axiosClient.post(`/fatigue/assess/${shift.id}`);
        setAssessments((prev) => ({ ...prev, [shift.id]: res.data.data }));
      } catch (err) {
        setAssessments((prev) => ({ ...prev, [shift.id]: { error: true } }));
      }
    }
  }

  const todayKey = new Date().toDateString();
  const assessedShifts = (list) =>
    list.filter((s) => assessments[s.id] && !assessments[s.id].error).sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

  const todayIds = new Set(employeeShifts.filter((s) => new Date(s.startTime).toDateString() === todayKey).map((s) => s.id));
  const lastAssignedShift =
    employeeShifts.length > 0
      ? [...employeeShifts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]
      : null;

  const todayShifts = assessedShifts(employeeShifts.filter((s) => todayIds.has(s.id)));
  const otherShifts = assessedShifts(
    employeeShifts.filter((s) => !todayIds.has(s.id) && s.id !== lastAssignedShift?.id)
  );
  const stillChecking = employeeShifts.some((s) => !(s.id in assessments));

  function ReportCard({ shift, showDate = false }) {
    const a = assessments[shift.id];
    if (!a || a.error) return null;
    return (
      <div className="border border-line/10 rounded-xl p-3">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <StatusBadge tone={RISK_TONE[a.riskLevel]} label={`${a.riskLevel} · ${a.riskScore}`} />
          {showDate && <span className="text-sm text-ink font-medium">{formatDate(shift.startTime)}</span>}
          <span className="text-xs text-ink-muted">{formatTime(shift.startTime)} – {formatTime(shift.endTime)}</span>
        </div>
        <p className="text-sm text-ink-secondary">{a.aiExplanation}</p>
        <p className="text-sm text-ink-secondary"><b className="text-ink">Suggestion:</b> {a.suggestedAlternative}</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-ink">Shifts</h1>

      {/* Employee picker */}
      <div className="bg-surface-card border border-line/10 rounded-2xl p-4 flex flex-wrap items-end gap-4">
        <div>
          <label className="text-xs text-ink-muted block mb-1">Employee</label>
          <select
            value={selectedEmployeeId}
            onChange={(e) => selectEmployee(e.target.value)}
            className={`${inputClass} min-w-[220px] py-2`}
          >
            <option value="" className="bg-surface-card">Select an employee…</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id} className="bg-surface-card">{emp.name}</option>
            ))}
          </select>
        </div>
        {selectedEmployee && (
          <div className="flex flex-wrap items-center gap-2 text-sm text-ink-secondary ml-auto">
            {selectedEmployee.department && (
              <span className="bg-line/5 px-2 py-1 rounded-md">{selectedEmployee.department}</span>
            )}
            <span className="bg-line/5 px-2 py-1 rounded-md">{selectedEmployee.maxWeeklyHours}h/week max</span>
            <span className="bg-accent/10 text-accent px-2 py-1 rounded-md font-semibold">
              {employeeShifts.length} shift{employeeShifts.length === 1 ? '' : 's'}
            </span>
          </div>
        )}
      </div>

      {error && <p className="text-status-critical text-sm">{error}</p>}

      {!selectedEmployeeId && (
        <p className="text-ink-muted text-center py-12">
          Select an employee above to view and manage all of their shifts in one place.
        </p>
      )}

      {/* Shifts table on the left (grows to fill space), fatigue reports in a
          fixed-width sidebar on the right; a 3rd panel opens when "Other
          shifts" is toggled. Flex (not grid fractions) so the table never
          gets squeezed down to where its Actions column clips. */}
      {selectedEmployeeId && (
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          <div className="flex-1 min-w-0 w-full bg-surface-card border border-line/10 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-line/5 text-ink-muted text-left">
              <tr>
                <th className="px-4 py-3 whitespace-nowrap">Date</th>
                <th className="px-4 py-3 whitespace-nowrap">Start</th>
                <th className="px-4 py-3 whitespace-nowrap">End</th>
                <th className="px-4 py-3 whitespace-nowrap">Type</th>
                <th className="px-4 py-3 whitespace-nowrap">Risk</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {/* New-shift row: always the first row while an employee is selected */}
              <tr className="border-t border-line/10 bg-accent/5">
                <td className="px-4 py-2">
                  <input
                    type="date"
                    value={addForm.date}
                    onChange={(e) => setAddForm({ ...addForm, date: e.target.value })}
                    className={inputClass}
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="time"
                    value={addForm.start}
                    onChange={(e) => setAddForm({ ...addForm, start: e.target.value })}
                    className={inputClass}
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="time"
                    value={addForm.end}
                    onChange={(e) => setAddForm({ ...addForm, end: e.target.value })}
                    className={inputClass}
                  />
                </td>
                <td className="px-4 py-2">
                  <select
                    value={addForm.shiftType}
                    onChange={(e) => setAddForm({ ...addForm, shiftType: e.target.value })}
                    className={inputClass}
                  >
                    {SHIFT_TYPES.map((t) => (
                      <option key={t} value={t} className="bg-surface-card capitalize">{t}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2 text-ink-muted text-xs">—</td>
                <td className="px-4 py-2 text-right">
                  <ActionButton tone="good" onClick={handleAdd} disabled={adding || !addForm.date}>
                    {adding ? 'Adding…' : '+ Add shift'}
                  </ActionButton>
                </td>
              </tr>

              {employeeShifts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-ink-muted">
                    No shifts yet for {selectedEmployee?.name}. Add the first one above.
                  </td>
                </tr>
              )}

              {employeeShifts.map((shift) => {
                const isEditing = editingId === shift.id;
                const assessment = assessments[shift.id];

                if (isEditing) {
                  return (
                    <tr key={shift.id} className="border-t border-line/10 bg-accent/5">
                      <td className="px-4 py-2">
                        <input
                          type="date"
                          value={editForm.date}
                          onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                          className={inputClass}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="time"
                          value={editForm.start}
                          onChange={(e) => setEditForm({ ...editForm, start: e.target.value })}
                          className={inputClass}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="time"
                          value={editForm.end}
                          onChange={(e) => setEditForm({ ...editForm, end: e.target.value })}
                          className={inputClass}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <select
                          value={editForm.shiftType}
                          onChange={(e) => setEditForm({ ...editForm, shiftType: e.target.value })}
                          className={inputClass}
                        >
                          {SHIFT_TYPES.map((t) => (
                            <option key={t} value={t} className="bg-surface-card capitalize">{t}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-2 text-ink-muted text-xs whitespace-nowrap">—</td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <div className="flex gap-2 justify-end">
                          <ActionButton tone="good" onClick={() => handleSaveEdit(shift.id)} disabled={savingId === shift.id}>
                            {savingId === shift.id ? 'Saving…' : 'Save'}
                          </ActionButton>
                          <ActionButton tone="neutral" onClick={() => setEditingId(null)}>Cancel</ActionButton>
                          <ActionButton tone="critical" onClick={() => handleDelete(shift.id)}>Delete</ActionButton>
                        </div>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={shift.id} className="border-t border-line/10 hover:bg-line/5 transition">
                    <td className="px-4 py-3 text-ink font-medium whitespace-nowrap">{formatDate(shift.startTime)}</td>
                    <td className="px-4 py-3 text-ink-secondary whitespace-nowrap">{formatTime(shift.startTime)}</td>
                    <td className="px-4 py-3 text-ink-secondary whitespace-nowrap">{formatTime(shift.endTime)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs bg-line/10 text-ink-secondary px-2 py-1 rounded-md capitalize">{shift.shiftType}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {!assessment && <span className="text-ink-muted text-xs">Checking…</span>}
                      {assessment?.error && <span className="text-status-critical text-xs">Assess failed</span>}
                      {assessment && !assessment.error && (
                        <StatusBadge tone={RISK_TONE[assessment.riskLevel]} label={`${assessment.riskLevel} · ${assessment.riskScore}`} />
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex gap-2 justify-end">
                        <ActionButton tone="neutral" onClick={() => startEdit(shift)}>Edit</ActionButton>
                        <ActionButton tone="critical" onClick={() => handleDelete(shift.id)}>Delete</ActionButton>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
          </div>

          {/* Fatigue reports — just today's report, the last-assigned shift's
              report, and a button to reveal everything else in its own column. */}
          <div className="lg:w-80 shrink-0 w-full lg:sticky lg:top-6 bg-surface-card border border-line/10 border-l-4 border-l-accent rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold text-ink">Fatigue assessment</h2>
              <ActionButton tone="neutral" onClick={handleReassessAll} disabled={stillChecking}>
                {stillChecking ? 'Checking…' : 'Re-assess'}
              </ActionButton>
            </div>

            {employeeShifts.length === 0 && (
              <p className="text-sm text-ink-muted">No shifts to assess yet.</p>
            )}

            {employeeShifts.length > 0 && stillChecking && (
              <p className="text-sm text-ink-muted">Checking fatigue risk for all shifts…</p>
            )}

            {employeeShifts.length > 0 && !stillChecking && (
              <>
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wide text-ink-muted font-semibold">Today's report</p>
                  {todayShifts.length === 0 && <p className="text-sm text-ink-muted">No shift scheduled today.</p>}
                  {todayShifts.map((shift) => <ReportCard key={shift.id} shift={shift} />)}
                </div>

                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wide text-ink-muted font-semibold">Last assigned report</p>
                  {lastAssignedShift && assessments[lastAssignedShift.id] && !assessments[lastAssignedShift.id].error ? (
                    <ReportCard shift={lastAssignedShift} showDate />
                  ) : (
                    <p className="text-sm text-ink-muted">Not available.</p>
                  )}
                </div>

                <ActionButton tone="accent" onClick={() => setShowOtherShifts((v) => !v)}>
                  {showOtherShifts ? 'Hide other shifts' : `Other shifts (${otherShifts.length})`}
                </ActionButton>
              </>
            )}
          </div>

          {/* 3rd panel: every other shift's report, only shown when toggled */}
          {showOtherShifts && (
            <div className="lg:w-80 shrink-0 w-full bg-surface-card border border-line/10 rounded-2xl p-4 space-y-3">
              <h2 className="font-semibold text-ink">Other shifts</h2>
              {otherShifts.length === 0 && <p className="text-sm text-ink-muted">Nothing else to show.</p>}
              {otherShifts.map((shift) => <ReportCard key={shift.id} shift={shift} showDate />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
