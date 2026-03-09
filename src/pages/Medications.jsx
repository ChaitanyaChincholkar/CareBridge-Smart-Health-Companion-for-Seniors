import { useEffect, useRef, useState } from 'react';
import { getFirestore, collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import app, { auth } from '../services/firebase';
import AppLayout from '../components/AppLayout';
import Modal from '../components/Modal';
import { elderNavItems } from '../config/nav';
import { Plus } from 'lucide-react';

const db = getFirestore(app);

const cardClass = 'bg-white rounded-xl shadow-sm border border-slate-200 p-5';

export default function Medications() {
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [time, setTime] = useState('');
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const alarmAudioRef = useRef(new Audio('https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg'));
  const triggeredRemindersRef = useRef(new Set());

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'medications'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data()
        }));
        setMedications(items);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setError('Unable to load medications right now.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 5); // HH:MM

      medications.forEach((med) => {
        const reminderKey = `${med.id}-${med.time}`;

        if (
          med.time === currentTime
          && med.status === 'pending'
          && !triggeredRemindersRef.current.has(reminderKey)
        ) {
          alarmAudioRef.current.currentTime = 0;
          alarmAudioRef.current.play().catch(() => { });

          window.alert(`Time to take your medicine: ${med.name}`);

          triggeredRemindersRef.current.add(reminderKey);
        }
      });
    }, 30000);

    return () => clearInterval(interval);
  }, [medications]);

  const handleAddMedication = async (event) => {
    event.preventDefault();
    setError('');

    const user = auth.currentUser;
    if (!user) {
      setError('Please log in to manage your medications.');
      return;
    }

    if (!name || !dosage || !time) {
      setError('Please fill in name, dosage, and time.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { getFirestore, collection, addDoc } = await import('firebase/firestore');
      const dbFirestore = getFirestore(app);

      await addDoc(collection(dbFirestore, 'medications'), {
        name: name.trim(),
        dosage: dosage.trim(),
        time,
        userId: user.uid,
        status: 'pending',
        createdAt: Date.now(),
      });

      setName('');
      setDosage('');
      setTime('');
      setModalOpen(false);
    } catch (err) {
      console.error(err);
      setError('Could not save this medication. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id, status) => {
    const user = auth.currentUser;
    if (!user) {
      setError('Please log in to update medications.');
      return;
    }

    try {
      const medRef = doc(db, 'medications', id);
      await updateDoc(medRef, { status });
    } catch (err) {
      console.error(err);
      setError('Could not update medication status. Please try again.');
    }
  };

  const user = auth.currentUser;

  return (
    <AppLayout navItems={elderNavItems}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-900">Medications</h2>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition text-sm"
        >
          <Plus className="w-4 h-4" />
          Add Medication
        </button>
      </div>

      {!user && (
        <p className="mb-4 text-sm text-red-700 bg-red-100 border border-red-300 rounded-xl px-4 py-3">
          Please log in to add and view your medications.
        </p>
      )}
      {error && (
        <p className="mb-4 text-sm text-red-700 bg-red-100 border border-red-300 rounded-xl px-4 py-3" role="alert">
          {error}
        </p>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Medication">
        <form className="space-y-4" onSubmit={handleAddMedication} noValidate>
          <div>
            <label htmlFor="med-name" className="block text-sm font-semibold text-slate-800 mb-2">Name</label>
            <input
              id="med-name"
              type="text"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:border-indigo-500"
              placeholder="e.g. Paracetamol"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="med-dosage" className="block text-sm font-semibold text-slate-800 mb-2">Dosage</label>
            <input
              id="med-dosage"
              type="text"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:border-indigo-500"
              placeholder="e.g. 1 tablet"
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="med-time" className="block text-sm font-semibold text-slate-800 mb-2">Time</label>
            <input
              id="med-time"
              type="time"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:border-indigo-500"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="w-full py-3 text-sm font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition disabled:opacity-70 disabled:cursor-not-allowed"
            disabled={!user || isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save Medication'}
          </button>
        </form>
      </Modal>

      {loading ? (
        <p className="text-sm text-slate-600">Loading medications…</p>
      ) : medications.length === 0 ? (
        <p className={`${cardClass} text-sm text-slate-600`}>
          {user ? 'No medications added yet. Click "Add Medication" to add one.' : 'Log in to see your medications.'}
        </p>
      ) : (
        <ul className="space-y-4">
          {medications.map((med) => (
            <li key={med.id} className={cardClass}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{med.name}</p>
                  <p className="text-sm text-slate-700">Dosage: {med.dosage}</p>
                  <p className="text-sm text-slate-700">Time: {med.time}</p>
                  <p className="text-sm mt-1">
                    Status:{' '}
                    <span
                      className={
                        med.status === 'taken' ? 'font-semibold text-green-700' :
                          med.status === 'missed' ? 'font-semibold text-red-700' :
                            'font-semibold text-amber-700'
                      }
                    >
                      {med.status ? med.status.charAt(0).toUpperCase() + med.status.slice(1) : 'Pending'}
                    </span>
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    className="px-3 py-2 text-sm font-semibold rounded-lg bg-green-600 text-white hover:bg-green-700 transition"
                    onClick={() => handleUpdateStatus(med.id, 'taken')}
                  >
                    Taken
                  </button>
                  <button
                    type="button"
                    className="px-3 py-2 text-sm font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 transition"
                    onClick={() => handleUpdateStatus(med.id, 'missed')}
                  >
                    Missed
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AppLayout>
  );
}
