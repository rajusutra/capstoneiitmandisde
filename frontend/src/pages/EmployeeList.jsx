// Employees page: list, add and delete employees.
import { useEffect, useState } from 'react';
import axiosClient, { errorMessage } from '../api/axiosClient';

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

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Employees</h1>

      {/* Add form */}
      <form onSubmit={handleAdd} className="bg-white rounded-xl shadow p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs text-gray-500 block">Name</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="border rounded px-3 py-2" required />
        </div>
        <div>
          <label className="text-xs text-gray-500 block">Employee code</label>
          <input value={form.employeeCode} onChange={(e) => setForm({ ...form, employeeCode: e.target.value })}
            className="border rounded px-3 py-2" placeholder="EMP-001" required />
        </div>
        <div>
          <label className="text-xs text-gray-500 block">Department</label>
          <input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}
            className="border rounded px-3 py-2" />
        </div>
        <div>
          <label className="text-xs text-gray-500 block">Max weekly hours</label>
          <input type="number" value={form.maxWeeklyHours}
            onChange={(e) => setForm({ ...form, maxWeeklyHours: Number(e.target.value) })}
            className="border rounded px-3 py-2 w-24" min="1" max="100" />
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-semibold">
          Add employee
        </button>
        {error && <p className="text-red-600 text-sm w-full">{error}</p>}
      </form>

      {/* Table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
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
              <tr key={emp.id} className="border-t">
                <td className="px-4 py-3 font-medium">{emp.name}</td>
                <td className="px-4 py-3">{emp.employeeCode}</td>
                <td className="px-4 py-3">{emp.department}</td>
                <td className="px-4 py-3">{emp.maxWeeklyHours}h</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => handleDelete(emp.id)} className="text-red-500 hover:underline">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {employees.length === 0 && (
              <tr>
                <td colSpan="5" className="px-4 py-6 text-center text-gray-400">
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
