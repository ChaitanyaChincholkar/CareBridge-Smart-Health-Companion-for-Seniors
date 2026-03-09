import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getFirestore, collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import app, { auth } from '../services/firebase';
import AppLayout from '../components/AppLayout';
import { elderNavItems } from '../config/nav';

const db = getFirestore(app);

export default function SOS() {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSendSOS = async () => {
    setError('');
    setSent(false);

    const user = auth.currentUser;
    if (!user) {
      setError('Please log in so we can notify your caregiver.');
      return;
    }

    setSending(true);

    try {
      const sosDocRef = await addDoc(collection(db, 'sos'), {
        userId: user.uid,
        timestamp: Date.now(),
        message: 'Emergency help requested',
      });

      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords || {};
            if (typeof latitude === 'number' && typeof longitude === 'number') {
              updateDoc(sosDocRef, { latitude, longitude }).catch(() => { });
            }
          },
          () => { },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
        );
      }

      setSent(true);
    } catch (err) {
      console.error(err);
      setError('Unable to send alert right now. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <AppLayout navItems={elderNavItems}>
      <h2 className="text-xl font-bold text-slate-900 mb-4">Emergency SOS</h2>
      <p className="text-sm text-slate-700 mb-6 max-w-xl">
        Press the button below if you need urgent help. Your caregiver will see your alert immediately.
      </p>

      {error && (
        <p
          className="mb-4 text-sm text-red-700 bg-red-100 border border-red-300 rounded-xl px-4 py-3"
          role="alert"
        >
          {error}
        </p>
      )}

      {sent && (
        <p
          className="mb-4 text-sm text-green-700 bg-green-100 border border-green-300 rounded-xl px-4 py-3"
          role="status"
        >
          Emergency Alert Sent to Caregiver
        </p>
      )}

      <div className="flex flex-col items-center justify-center py-12">
        <button
          type="button"
          className={`w-56 h-56 rounded-full bg-red-600 hover:bg-red-700 text-white flex flex-col items-center justify-center text-lg font-bold shadow-2xl transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-400 disabled:opacity-70 disabled:cursor-not-allowed ${!sending ? 'animate-pulse' : ''
            }`}
          onClick={handleSendSOS}
          disabled={sending}
          aria-busy={sending}
          aria-label="Send emergency SOS alert"
        >
          <span className="mb-1">🚨 SOS</span>
          <span className="text-base font-semibold">Press for Help</span>
        </button>
      </div>
    </AppLayout>
  );
}
