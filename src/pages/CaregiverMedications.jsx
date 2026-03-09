import { useEffect, useState } from 'react';
import { getFirestore, collection, onSnapshot, doc, getDoc } from 'firebase/firestore';
import app from '../services/firebase';
import AppLayout from '../components/AppLayout';
import { caregiverNavItems } from '../config/nav';

const db = getFirestore(app);

const cardClass = 'bg-white rounded-xl shadow-sm border border-slate-200 p-5';

export default function CaregiverMedications() {
  const [medsByElder, setMedsByElder] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'medications'),
      async (snapshot) => {
        const collected = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
        const uniqueUserIds = Array.from(new Set(collected.map(m => m.userId).filter(Boolean)));

        if (uniqueUserIds.length === 0) {
          setMedsByElder([]);
          setLoading(false);
          return;
        }

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

          const grouped = uniqueUserIds.map((uid) => {
            const userMeds = collected.filter((m) => m.userId === uid);
            userMeds.sort((a, b) => (a.time || '').localeCompare(b.time || ''));
            return {
              userId: uid,
              elderName: namesById[uid],
              medications: items,
            };
          });

          setMedsByElder(grouped);
        } catch {
          setMedsByElder([]);
        }
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setMedsByElder([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return (
    <AppLayout navItems={caregiverNavItems}>
      <h2 className="text-xl font-bold text-slate-900 mb-6">Elder Medications</h2>

      {loading ? (
        <p className="text-sm text-slate-600">Loading medications…</p>
      ) : medsByElder.length === 0 ? (
        <p className={`${cardClass} text-sm text-slate-600`}>No medications found.</p>
      ) : (
        <div className="space-y-6">
          {medsByElder.map((group) => (
            <section key={group.userId}>
              <h3 className="text-base font-bold text-slate-900 mb-3">{group.elderName}</h3>
              <ul className="space-y-3">
                {group.medications.map((med) => (
                  <li key={med.id} className={cardClass}>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-900">{med.name}</p>
                        <p className="text-sm text-slate-700">Time: {med.time}</p>
                        <p className="text-sm">
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
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
