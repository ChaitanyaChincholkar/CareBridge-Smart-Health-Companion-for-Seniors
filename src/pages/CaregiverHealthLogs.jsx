import { useEffect, useState } from 'react';
import { getFirestore, collection, onSnapshot, doc, getDoc } from 'firebase/firestore';
import app from '../services/firebase';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import AppLayout from '../components/AppLayout';
import { caregiverNavItems } from '../config/nav';

const db = getFirestore(app);

const cardClass = 'bg-white rounded-xl shadow-sm border border-slate-200 p-5';

function parseNumeric(val) {
  if (val == null || val === '') return null;
  if (typeof val === 'number') return val;
  const str = String(val);
  if (str.includes('/')) {
    const parts = str.split('/').map((p) => parseFloat(p.trim()));
    return parts.length === 2 && !Number.isNaN(parts[0]) ? parts[0] : null;
  }
  const n = parseFloat(str);
  return Number.isNaN(n) ? null : n;
}

export default function CaregiverHealthLogs() {
  const [healthLogsByElder, setHealthLogsByElder] = useState([]);
  const [selectedElderId, setSelectedElderId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'healthLogs'),
      async (snapshot) => {
        const collected = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data()
        }));

        collected.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        const uniqueUserIds = Array.from(new Set(collected.map((l) => l.userId).filter(Boolean)));

        let logsWithNames = collected;

        if (uniqueUserIds.length > 0) {
          try {
            const nameEntries = await Promise.all(
              uniqueUserIds.map(async (uid) => {
                try {
                  const elderDocRef = doc(db, 'elders', uid);
                  const elderSnap = await getDoc(elderDocRef);
                  if (elderSnap.exists()) {
                    return [uid, elderSnap.data().name || uid];
                  }
                  return [uid, uid];
                } catch {
                  return [uid, uid];
                }
              })
            );
            const namesById = Object.fromEntries(nameEntries);
            logsWithNames = collected.map((l) => ({ ...l, elderName: namesById[l.userId] || null }));
          } catch {
            logsWithNames = collected;
          }
        }

        const byElder = {};
        logsWithNames.forEach((log) => {
          const uid = log.userId;
          if (!byElder[uid]) {
            byElder[uid] = { elderName: log.elderName || uid, userId: uid, logs: [] };
          }
          byElder[uid].logs.push(log);
        });

        const grouped = Object.values(byElder).map((g) => ({
          ...g,
          logs: g.logs.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)),
        }));

        grouped.sort((a, b) => {
          const aLatest = a.logs[0]?.createdAt || 0;
          const bLatest = b.logs[0]?.createdAt || 0;
          return bLatest - aLatest;
        });

        setHealthLogsByElder(grouped);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setError('Unable to load health logs right now.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (healthLogsByElder.length > 0 && !selectedElderId) {
      setSelectedElderId(healthLogsByElder[0].userId);
    }
  }, [healthLogsByElder, selectedElderId]);

  const selectedGroup = healthLogsByElder.find((g) => g.userId === selectedElderId) || healthLogsByElder[0];
  const chartData = selectedGroup
    ? [...selectedGroup.logs]
      .reverse()
      .filter((l) => l.createdAt)
      .map((l) => ({
        date: new Date(l.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        bp: parseNumeric(l.bp),
        sugar: parseNumeric(l.sugar),
        heartRate: parseNumeric(l.heartRate),
      }))
    : [];

  return (
    <AppLayout navItems={caregiverNavItems}>
      <h2 className="text-xl font-bold text-slate-900 mb-6">Elder Health Logs</h2>

      {error && (
        <p className="mb-4 text-sm text-red-700 bg-red-100 border border-red-300 rounded-xl px-4 py-3" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-slate-600">Loading health logs…</p>
      ) : healthLogsByElder.length === 0 ? (
        <p className={`${cardClass} text-sm text-slate-600`}>No health logs at the moment.</p>
      ) : (
        <>
          <div className="mb-6">
            <label htmlFor="elder-select" className="block text-sm font-semibold text-slate-800 mb-2">
              Select Elder
            </label>
            <select
              id="elder-select"
              value={selectedElderId}
              onChange={(e) => setSelectedElderId(e.target.value)}
              className="px-4 py-2 rounded-xl border border-slate-300 text-sm font-medium text-slate-800 focus:border-indigo-500"
            >
              {healthLogsByElder.map((g) => (
                <option key={g.userId} value={g.userId}>
                  {g.elderName}
                </option>
              ))}
            </select>
          </div>

          {chartData.length > 0 && (
            <div className={`${cardClass} mb-6`}>
              <h3 className="text-base font-semibold text-slate-900 mb-4">Health Trends</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    {chartData.some((d) => d.bp != null) && (
                      <Line type="monotone" dataKey="bp" name="BP (Systolic)" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
                    )}
                    {chartData.some((d) => d.sugar != null) && (
                      <Line type="monotone" dataKey="sugar" name="Sugar" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                    )}
                    {chartData.some((d) => d.heartRate != null) && (
                      <Line type="monotone" dataKey="heartRate" name="Heart Rate" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <h3 className="text-base font-semibold text-slate-900 mb-4">Health Log History</h3>
          <ul className="space-y-4">
            {selectedGroup?.logs.map((log) => (
              <li key={`${log.userId}-${log.id}`} className={cardClass}>
                {log.bp != null && log.bp !== '' && <p className="text-sm text-slate-700">BP: <span className="font-semibold">{log.bp}</span></p>}
                {log.sugar != null && log.sugar !== '' && <p className="text-sm text-slate-700">Sugar: <span className="font-semibold">{log.sugar}</span></p>}
                {log.heartRate != null && log.heartRate !== '' && <p className="text-sm text-slate-700">Heart Rate: <span className="font-semibold">{log.heartRate}</span></p>}
                {log.notes != null && log.notes !== '' && <p className="text-sm text-slate-700">Notes: <span className="font-semibold">{log.notes}</span></p>}
                <p className="text-xs text-slate-500 mt-2">Date: {log.createdAt ? new Date(log.createdAt).toLocaleDateString() : '—'}</p>
              </li>
            ))}
          </ul>
        </>
      )}
    </AppLayout>
  );
}
