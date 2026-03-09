import { useEffect, useState } from 'react';
import { getFirestore, collection, onSnapshot, query, doc, getDoc } from 'firebase/firestore';
import app, { auth } from '../services/firebase';
import AppLayout from '../components/AppLayout';
import { caregiverNavItems } from '../config/nav';

const db = getFirestore(app);

const cardClass = 'bg-white rounded-xl shadow-sm border border-slate-200 p-5';

export default function CaregiverOverview() {
  const [totalElders, setTotalElders] = useState(0);
  const [activeSOS, setActiveSOS] = useState(0);
  const [recentHealthCount, setRecentHealthCount] = useState(0);
  const [caregiverName, setCaregiverName] = useState('');
  const [loadingName, setLoadingName] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      const fetchName = async () => {
        try {
          const docRef = doc(db, 'caregivers', user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists() && docSnap.data().name) {
            setCaregiverName(docSnap.data().name);
          }
        } catch (err) {
          console.error('Error fetching caregiver name:', err);
        } finally {
          setLoadingName(false);
        }
      };
      fetchName();
    } else {
      setLoadingName(false);
    }

    const eldersSet = new Set();
    const updateTotals = () => {
      setTotalElders(eldersSet.size);
    };

    const sosUnsub = onSnapshot(collection(db, 'sos'), (snapshot) => {
      let unhandled = 0;
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.userId) eldersSet.add(data.userId);
        if (!data.handled) unhandled++;
      });
      setActiveSOS(unhandled);
      updateTotals();
    });

    const healthUnsub = onSnapshot(collection(db, 'healthLogs'), (snapshot) => {
      let count = 0;
      const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.userId) eldersSet.add(data.userId);
        if (data.createdAt && data.createdAt >= dayAgo) count++;
      });
      setRecentHealthCount(count);
      updateTotals();
    });

    const medsUnsub = onSnapshot(collection(db, 'medications'), (snapshot) => {
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.userId) eldersSet.add(data.userId);
      });
      updateTotals();
    });

    return () => {
      sosUnsub();
      healthUnsub();
      medsUnsub();
    };
  }, []);

  return (
    <AppLayout navItems={caregiverNavItems}>
      <h2 className="text-xl font-bold text-slate-900 mb-6">
        {loadingName ? 'Dashboard Overview' : `Hello, ${caregiverName || 'User'}`}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className={cardClass}>
          <h3 className="text-base font-semibold text-slate-900 mb-2">Total Elders</h3>
          <p className="text-2xl font-semibold text-indigo-600">{totalElders}</p>
          <p className="text-sm text-slate-600 mt-1">Elders with activity</p>
        </div>
        <div className={cardClass}>
          <h3 className="text-base font-semibold text-slate-900 mb-2">Active SOS Alerts</h3>
          <p className="text-2xl font-semibold text-red-600">{activeSOS}</p>
          <p className="text-sm text-slate-600 mt-1">Need attention</p>
        </div>
        <div className={cardClass}>
          <h3 className="text-base font-semibold text-slate-900 mb-2">Recent Health Updates</h3>
          <p className="text-2xl font-semibold text-green-600">{recentHealthCount}</p>
          <p className="text-sm text-slate-600 mt-1">Last 24 hours</p>
        </div>
      </div>
    </AppLayout>
  );
}
