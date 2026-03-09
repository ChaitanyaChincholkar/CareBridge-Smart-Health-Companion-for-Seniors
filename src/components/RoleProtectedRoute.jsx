import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { getDatabase, ref, get } from 'firebase/database';
import app, { auth } from '../services/firebase';

export default function RoleProtectedRoute({ requiredRole, children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setUser(null);
        setRole(null);
        setChecking(false);
        return;
      }

      setUser(currentUser);

      try {
        if (requiredRole === 'caregiver') {
          // Check Firestore first for caregiver role
          const { getFirestore, doc, getDoc } = await import('firebase/firestore');
          const dbFirestore = getFirestore(app);
          const caregiverDoc = await getDoc(doc(dbFirestore, 'caregivers', currentUser.uid));

          if (caregiverDoc.exists() && caregiverDoc.data().role === 'caregiver') {
            setRole('caregiver');
          } else {
            setRole(null);
          }
        } else {
          // Check Firestore for elder role
          const { getFirestore, doc, getDoc } = await import('firebase/firestore');
          const dbFirestore = getFirestore(app);
          const elderDoc = await getDoc(doc(dbFirestore, 'elders', currentUser.uid));

          if (elderDoc.exists() && elderDoc.data().role === 'elder') {
            setRole('elder');
          } else {
            setRole(null);
          }
        }
      } catch (err) {
        console.error("Error checking role:", err);
        setRole(null);
      } finally {
        setChecking(false);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [requiredRole]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 text-slate-700 text-lg">
        Checking your access…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return children;
}

