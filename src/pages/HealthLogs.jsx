import { useEffect, useState } from 'react';
import { getFirestore, collection, query, where, onSnapshot, addDoc } from 'firebase/firestore';
import app, { auth } from '../services/firebase';
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
import Modal from '../components/Modal';
import { elderNavItems } from '../config/nav';
import { Plus } from 'lucide-react';

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

export default function HealthLogs() {
  const [bp, setBp] = useState('');
  const [sugar, setSugar] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [notes, setNotes] = useState('');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'healthLogs'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data()
        }));
        items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setLogs(items);
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

  const chartData = [...logs]
    .reverse()
    .filter((l) => l.createdAt)
    .map((l) => ({
      date: new Date(l.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      bp: parseNumeric(l.bp),
      sugar: parseNumeric(l.sugar),
      heartRate: parseNumeric(l.heartRate),
    }));

  const handleAddLog = async (event) => {
    event.preventDefault();
    setError('');

    const user = auth.currentUser;
    if (!user) {
      setError('Please log in to add health logs.');
      return;
    }

    if (!bp && !sugar && !heartRate && !notes) {
      setError('Please fill in at least one field.');
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'healthLogs'), {
        bp: bp.trim() || null,
        sugar: sugar.trim() || null,
        heartRate: heartRate.trim() || null,
        notes: notes.trim() || null,
        userId: user.uid,
        createdAt: Date.now(),
      });

      setBp('');
      setSugar('');
      setHeartRate('');
      setNotes('');
      setModalOpen(false);
    } catch (err) {
      console.error(err);
      setError('Could not save this health log. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const user = auth.currentUser;

  return (
    <AppLayout navItems={elderNavItems}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-900">Health Logs</h2>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition text-sm"
        >
          <Plus className="w-4 h-4" />
          Add Health Log
        </button>
      </div>

      {!user && (
        <p className="mb-4 text-sm text-red-700 bg-red-100 border border-red-300 rounded-xl px-4 py-3">
          Please log in to add and view your health logs.
        </p>
      )}
      {error && (
        <p className="mb-4 text-sm text-red-700 bg-red-100 border border-red-300 rounded-xl px-4 py-3" role="alert">
          {error}
        </p>
      )}

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

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Health Log">
        <form className="space-y-4" onSubmit={handleAddLog} noValidate>
          <div>
            <label htmlFor="health-bp" className="block text-sm font-semibold text-slate-800 mb-2">Blood Pressure</label>
            <input
              id="health-bp"
              type="text"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:border-indigo-500"
              placeholder="e.g. 120/80"
              value={bp}
              onChange={(e) => setBp(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="health-sugar" className="block text-sm font-semibold text-slate-800 mb-2">Sugar Level</label>
            <input
              id="health-sugar"
              type="text"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:border-indigo-500"
              placeholder="e.g. 95 mg/dL"
              value={sugar}
              onChange={(e) => setSugar(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="health-heartrate" className="block text-sm font-semibold text-slate-800 mb-2">Heart Rate</label>
            <input
              id="health-heartrate"
              type="text"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:border-indigo-500"
              placeholder="e.g. 72 bpm"
              value={heartRate}
              onChange={(e) => setHeartRate(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="health-notes" className="block text-sm font-semibold text-slate-800 mb-2">Notes</label>
            <textarea
              id="health-notes"
              rows={3}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:border-indigo-500"
              placeholder="Any additional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="w-full py-3 text-sm font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition disabled:opacity-70 disabled:cursor-not-allowed"
            disabled={!user || isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save Health Log'}
          </button>
        </form>
      </Modal>

      <h3 className="text-base font-semibold text-slate-900 mb-4">Health Log History</h3>
      {loading ? (
        <p className="text-sm text-slate-600">Loading health logs…</p>
      ) : logs.length === 0 ? (
        <p className={`${cardClass} text-sm text-slate-600`}>
          {user ? 'No data available' : 'Log in to see your health logs.'}
        </p>
      ) : (
        <ul className="space-y-4">
          {logs.map((log) => (
            <li key={log.id} className={cardClass}>
              <div>
                {log.bp != null && log.bp !== '' && (
                  <p className="text-sm text-slate-700">Blood Pressure: <span className="font-semibold text-slate-900">{log.bp}</span></p>
                )}
                {log.sugar != null && log.sugar !== '' && (
                  <p className="text-sm text-slate-700">Sugar: <span className="font-semibold text-slate-900">{log.sugar}</span></p>
                )}
                {log.heartRate != null && log.heartRate !== '' && (
                  <p className="text-sm text-slate-700">Heart Rate: <span className="font-semibold text-slate-900">{log.heartRate}</span></p>
                )}
                {log.notes != null && log.notes !== '' && (
                  <p className="text-sm text-slate-700">Notes: <span className="font-semibold text-slate-900">{log.notes}</span></p>
                )}
                <p className="text-xs text-slate-500 mt-2">
                  {log.createdAt ? new Date(log.createdAt).toLocaleString() : ''}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AppLayout>
  );
}
