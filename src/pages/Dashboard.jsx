import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getFirestore, collection, query, where, onSnapshot, doc, getDoc } from "firebase/firestore";
import app, { auth } from "../services/firebase";
import AppLayout from "../components/AppLayout";
import { elderNavItems } from "../config/nav";

const db = getFirestore(app);

function timeToMinutes(timeString = "") {
  const [h, m] = timeString.split(":").map((part) => parseInt(part, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return Number.POSITIVE_INFINITY;
  return h * 60 + m;
}

const cardClass = "bg-white rounded-xl shadow-sm border border-slate-200 p-5";

export default function Dashboard() {
  const [medications, setMedications] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [healthLogs, setHealthLogs] = useState([]);
  const [loadingMeds, setLoadingMeds] = useState(true);
  const [loadingAppts, setLoadingAppts] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [elderName, setElderName] = useState("");
  const [loadingName, setLoadingName] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLoadingMeds(false);
      setLoadingAppts(false);
      setLoadingLogs(false);
      setLoadingName(false);
      return;
    }

    const fetchName = async () => {
      try {
        const docRef = doc(db, 'elders', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().name) {
          setElderName(docSnap.data().name);
        }
      } catch (err) {
        console.error("Error fetching elder name:", err);
      } finally {
        setLoadingName(false);
      }
    };
    fetchName();

    const medsQuery = query(collection(db, 'medications'), where('userId', '==', user.uid));
    const medsUnsub = onSnapshot(
      medsQuery,
      (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        items.sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
        setMedications(items);
        setLoadingMeds(false);
      },
      (err) => {
        console.error(err);
        setMedications([]);
        setLoadingMeds(false);
      }
    );

    const apptsQuery = query(collection(db, 'appointments'), where('userId', '==', user.uid));
    const apptsUnsub = onSnapshot(
      apptsQuery,
      (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        items.sort((a, b) => {
          const aDate = a.date || "";
          const bDate = b.date || "";
          if (aDate === bDate) return (a.time || "").localeCompare(b.time || "");
          return aDate.localeCompare(bDate);
        });
        setAppointments(items);
        setLoadingAppts(false);
      },
      (err) => {
        console.error(err);
        setAppointments([]);
        setLoadingAppts(false);
      }
    );

    const logsQuery = query(collection(db, 'healthLogs'), where('userId', '==', user.uid));
    const logsUnsub = onSnapshot(
      logsQuery,
      (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setHealthLogs(items);
        setLoadingLogs(false);
      },
      (err) => {
        console.error(err);
        setHealthLogs([]);
        setLoadingLogs(false);
      }
    );

    return () => {
      medsUnsub();
      apptsUnsub();
      logsUnsub();
    };
  }, []);

  const latestLog = healthLogs[0];
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nextMed = medications.find((med) => timeToMinutes(med.time) >= nowMinutes) || medications[0];

  const upcomingAppt = (() => {
    const future = appointments.filter((a) => {
      const dateStr = a.date || "";
      const timeStr = a.time || "";
      if (!dateStr || !timeStr) return false;
      const [y, m, d] = dateStr.split("-").map(Number);
      const [h, min] = timeStr.split(":").map(Number);
      const apptDate = new Date(y, m - 1, d, h || 0, min || 0);
      return apptDate.getTime() > now.getTime();
    });
    future.sort((a, b) => {
      const toMs = (x) => {
        const [y, m, d] = (x.date || "").split("-").map(Number);
        const [h, min] = (x.time || "").split(":").map(Number);
        return new Date(y, m - 1, d, h || 0, min || 0).getTime();
      };
      return toMs(a) - toMs(b);
    });
    return future[0] || null;
  })();

  return (
    <AppLayout navItems={elderNavItems}>
      <h2 className="text-xl font-bold text-slate-900 mb-6">
        {loadingName ? "Dashboard" : `Hello, ${elderName || "User"}`}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <div className={cardClass}>
          <h3 className="text-base font-semibold text-slate-900 mb-3">Health Overview</h3>
          {loadingLogs ? (
            <p className="text-sm text-slate-600">Loading…</p>
          ) : latestLog ? (
            <div className="space-y-2 text-sm text-slate-700">
              {latestLog.bp && <p>Blood Pressure: <span className="font-semibold text-slate-900">{latestLog.bp}</span></p>}
              {latestLog.sugar && <p>Sugar: <span className="font-semibold text-slate-900">{latestLog.sugar}</span></p>}
              {latestLog.heartRate && <p>Heart Rate: <span className="font-semibold text-slate-900">{latestLog.heartRate}</span></p>}
              {latestLog.createdAt && (
                <p className="text-slate-500 mt-2">Last updated: {new Date(latestLog.createdAt).toLocaleDateString()}</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-600">No data available.</p>
          )}
        </div>

        <div className={cardClass}>
          <h3 className="text-base font-semibold text-slate-900 mb-3">Next Medication</h3>
          {loadingMeds ? (
            <p className="text-sm text-slate-600">Loading…</p>
          ) : nextMed ? (
            <p className="text-sm text-slate-700">
              <span className="font-semibold text-slate-900">{nextMed.name}</span>
              {" "}({nextMed.dosage}) at{" "}
              <span className="font-semibold">{nextMed.time}</span>
            </p>
          ) : (
            <p className="text-sm text-slate-600">No data available.</p>
          )}
        </div>

        <div className={cardClass}>
          <h3 className="text-base font-semibold text-slate-900 mb-3">Upcoming Appointment</h3>
          {loadingAppts ? (
            <p className="text-sm text-slate-600">Loading…</p>
          ) : upcomingAppt ? (
            <div className="space-y-1 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">{upcomingAppt.doctorName}</p>
              <p>Date: {upcomingAppt.date}</p>
              <p>Time: {upcomingAppt.time}</p>
              {upcomingAppt.hospital && <p>{upcomingAppt.hospital}</p>}
            </div>
          ) : (
            <p className="text-sm text-slate-600">No data available.</p>
          )}
        </div>
      </div>

      <section className="mb-8">
        <h3 className="text-base font-semibold text-slate-900 mb-4">Emergency Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <a
            href="tel:+911234567890"
            className={`${cardClass} flex flex-col items-center justify-center text-center hover:shadow-md transition`}
          >
            <span className="text-2xl mb-2" aria-hidden>📞</span>
            <span className="font-semibold text-slate-900 text-sm">Call Caregiver</span>
          </a>
          <a
            href="tel:108"
            className={`${cardClass} flex flex-col items-center justify-center text-center hover:shadow-md transition`}
          >
            <span className="text-2xl mb-2" aria-hidden>🚑</span>
            <span className="font-semibold text-slate-900 text-sm">Call Ambulance</span>
          </a>
          <Link
            to="/sos"
            className={`${cardClass} flex flex-col items-center justify-center text-center hover:shadow-md transition bg-red-50 border-red-200`}
          >
            <span className="text-2xl mb-2" aria-hidden>🆘</span>
            <span className="font-semibold text-red-800 text-sm">Send SOS</span>
          </Link>
        </div>
      </section>

      <section>
        <h3 className="text-base font-semibold text-slate-900 mb-4">Quick Links</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Link to="/medications" className={`${cardClass} flex items-center gap-3 hover:shadow-md transition`}>
            <span className="text-2xl" aria-hidden>💊</span>
            <span className="font-semibold text-slate-900 text-sm">Medications</span>
          </Link>
          <Link to="/appointments" className={`${cardClass} flex items-center gap-3 hover:shadow-md transition`}>
            <span className="text-2xl" aria-hidden>📅</span>
            <span className="font-semibold text-slate-900 text-sm">Appointments</span>
          </Link>
          <Link to="/health-logs" className={`${cardClass} flex items-center gap-3 hover:shadow-md transition`}>
            <span className="text-2xl" aria-hidden>📋</span>
            <span className="font-semibold text-slate-900 text-sm">Health Logs</span>
          </Link>
          <Link to="/sos" className={`${cardClass} flex items-center gap-3 hover:shadow-md transition bg-red-50 border-red-200`}>
            <span className="text-2xl" aria-hidden>🆘</span>
            <span className="font-semibold text-red-800 text-sm">SOS</span>
          </Link>
        </div>
      </section>
    </AppLayout>
  );
}
