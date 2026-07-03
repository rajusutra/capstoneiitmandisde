// Dashboard: quick stats + shortcuts to the main pages.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';

export default function ManagerDashboard() {
  const { tenant } = useAuth();
  const [stats, setStats] = useState({ employees: 0, shifts: 0, highRisk: 0 });

  useEffect(() => {
    async function load() {
      const [empRes, shiftRes, fatigueRes] = await Promise.all([
        axiosClient.get('/employees'),
        axiosClient.get('/shifts'),
        axiosClient.get('/fatigue/assessments'),
      ]);
      setStats({
        employees: empRes.data.data.length,
        shifts: shiftRes.data.data.length,
        highRisk: fatigueRes.data.data.filter((a) => a.riskLevel === 'high').length,
      });
    }
    load().catch(console.error);
  }, []);

  const cards = [
    { label: 'Employees', value: stats.employees, to: '/employees', color: 'bg-blue-500' },
    { label: 'Shifts', value: stats.shifts, to: '/shifts', color: 'bg-emerald-500' },
    { label: 'High-risk assessments', value: stats.highRisk, to: '/fatigue', color: 'bg-rose-500' },
  ];

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Welcome to {tenant?.name}</h1>
      <p className="text-gray-600">
        Plan shifts, manage your team and keep fatigue risk under control.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            to={card.to}
            className="bg-white rounded-xl shadow p-6 hover:shadow-lg transition"
          >
            <div className={`w-10 h-10 ${card.color} rounded-lg mb-3`} />
            <p className="text-3xl font-bold">{card.value}</p>
            <p className="text-gray-500">{card.label}</p>
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="font-semibold mb-2">How to use</h2>
        <ol className="list-decimal list-inside text-gray-600 space-y-1 text-sm">
          <li>Add your team members on the <Link to="/employees" className="text-blue-600">Employees</Link> page.</li>
          <li>Assign shifts on the <Link to="/shifts" className="text-blue-600">Shift Calendar</Link>.</li>
          <li>Click <b>Assess</b> on any shift to run the AI fatigue risk check.</li>
          <li>Review results and safer alternatives in the <Link to="/fatigue" className="text-blue-600">Fatigue Report</Link>.</li>
        </ol>
      </div>
    </div>
  );
}
