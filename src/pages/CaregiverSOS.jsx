import { useEffect, useState, useRef } from 'react';
import {
  getFirestore,
  collection,
  onSnapshot,
  doc,
  updateDoc,
  getDoc,
} from 'firebase/firestore';
import app from '../services/firebase';
import AppLayout from '../components/AppLayout';
import { caregiverNavItems } from '../config/nav';

const db = getFirestore(app);

const ALERT_SOUND_URL = 'https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg';

const cardClass = 'bg-white rounded-xl shadow-sm border border-slate-200 p-5';

export default function CaregiverSOS() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const audioRef = useRef(null);
  const audioUnlockedRef = useRef(false);
  const previousAlertIds = useRef(new Set());
  const hasInitialLoadRef = useRef(false);

  useEffect(() => {
    const unlockAudio = () => {
      if (!audioUnlockedRef.current) {
        const audio = new Audio(ALERT_SOUND_URL);
        audioRef.current = audio;

        audio.play().then(() => {
          audio.pause();
          audio.currentTime = 0;
          audioUnlockedRef.current = true;
        }).catch(() => { });

        document.removeEventListener('click', unlockAudio);
      }
    };

    document.addEventListener('click', unlockAudio);

    return () => {
      document.removeEventListener('click', unlockAudio);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'sos'),
      async (snapshot) => {
        const collected = snapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data()
        }));

        collected.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        const uniqueUserIds = Array.from(new Set(collected.map((a) => a.userId).filter(Boolean)));

        let alertsWithNames = collected;

        if (uniqueUserIds.length > 0) {
          try {
            const nameEntries = await Promise.all(
              uniqueUserIds.map(async (uid) => {
                try {
                  const elderDocRef = doc(db, 'elders', uid);
                  const elderSnap = await getDoc(elderDocRef);
                  if (elderSnap.exists()) {
                    return [uid, elderSnap.data().name || null];
                  }
                  return [uid, null];
                } catch {
                  return [uid, null];
                }
              })
            );
            const namesById = Object.fromEntries(nameEntries);
            alertsWithNames = collected.map((a) => ({
              ...a,
              elderName: namesById[a.userId] || null,
            }));
          } catch {
            alertsWithNames = collected;
          }
        }

        const currentIds = new Set();
        for (const alert of alertsWithNames) {
          const key = `${alert.userId}-${alert.id}`;
          currentIds.add(key);
          if (hasInitialLoadRef.current && !previousAlertIds.current.has(key) && audioUnlockedRef.current && audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(() => { });
          }
        }
        previousAlertIds.current = currentIds;
        hasInitialLoadRef.current = true;

        setAlerts(alertsWithNames);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setError('Unable to load SOS alerts right now.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleMarkHandled = async (alert) => {
    try {
      const alertRef = doc(db, 'sos', alert.id);
      await updateDoc(alertRef, { handled: true });
    } catch (err) {
      console.error(err);
      setError('Could not update alert. Please try again.');
    }
  };

  return (
    <AppLayout navItems={caregiverNavItems}>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900">Emergency SOS Alerts</h2>
      </div>

      {error && (
        <p className="mb-4 text-sm text-red-700 bg-red-100 border border-red-300 rounded-xl px-4 py-3" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-slate-600">Loading alerts…</p>
      ) : alerts.length === 0 ? (
        <p className={`${cardClass} text-sm text-slate-600`}>No SOS alerts at the moment.</p>
      ) : (
        <ul className="space-y-4">
          {alerts.map((alert) => (
            <li
              key={`${alert.userId}-${alert.id}`}
              className={`${cardClass} ${alert.handled ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'
                }`}
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">
                    {alert.message || 'Emergency help requested'}
                  </p>
                  <p className="text-sm text-slate-700">
                    Elder: <span className="font-semibold">{alert.elderName || alert.userId}</span>
                  </p>
                  <p className="text-sm text-slate-700">
                    Time: {alert.timestamp ? new Date(alert.timestamp).toLocaleString() : 'Unknown'}
                  </p>
                  <p className="text-sm">
                    Status:{' '}
                    <span className={alert.handled ? 'font-semibold text-green-700' : 'font-semibold text-red-700'}>
                      {alert.handled ? 'Handled' : 'Needs attention'}
                    </span>
                  </p>
                  {typeof alert.latitude === 'number' && typeof alert.longitude === 'number' && (
                    <a
                      href={`https://www.google.com/maps?q=${alert.latitude},${alert.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-2 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
                    >
                      View Map
                    </a>
                  )}
                </div>
                {!alert.handled && (
                  <button
                    type="button"
                    className="px-4 py-2 text-sm font-semibold rounded-xl bg-green-600 text-white hover:bg-green-700 transition shrink-0"
                    onClick={() => handleMarkHandled(alert)}
                  >
                    Mark Handled
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </AppLayout>
  );
}
