import { useEffect, useState } from "react";
import { getFirestore, collection, query, where, onSnapshot, addDoc } from "firebase/firestore";
import app, { auth } from "../services/firebase";
import AppLayout from "../components/AppLayout";
import Modal from "../components/Modal";
import { elderNavItems } from "../config/nav";
import { Plus } from "lucide-react";

const db = getFirestore(app);

const cardClass = "bg-white rounded-xl shadow-sm border border-slate-200 p-5";

export default function Appointments() {
  const [doctorName, setDoctorName] = useState("");
  const [hospital, setHospital] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'appointments'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data()
        }));

        items.sort((a, b) => {
          const aDate = a.date || "";
          const bDate = b.date || "";
          if (aDate === bDate) {
            return (a.time || "").localeCompare(b.time || "");
          }
          return aDate.localeCompare(bDate);
        });

        setAppointments(items);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setAppointments([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleAddAppointment = async (event) => {
    event.preventDefault();
    setError("");

    const user = auth.currentUser;
    if (!user) {
      setError("Please log in to add and view your appointments.");
      return;
    }

    if (!doctorName || !hospital || !date || !time) {
      setError("Please fill in doctor name, hospital, date, and time.");
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'appointments'), {
        doctorName: doctorName.trim(),
        hospital: hospital.trim(),
        date,
        time,
        userId: user.uid,
        createdAt: Date.now(),
      });

      setDoctorName("");
      setHospital("");
      setDate("");
      setTime("");
      setModalOpen(false);
    } catch (err) {
      console.error(err);
      setError("Could not save this appointment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const user = auth.currentUser;

  return (
    <AppLayout navItems={elderNavItems}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-900">Doctor Appointments</h2>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition text-sm"
        >
          <Plus className="w-4 h-4" />
          Add Appointment
        </button>
      </div>

      {!user && (
        <p className="mb-4 text-sm text-red-700 bg-red-100 border border-red-300 rounded-xl px-4 py-3">
          Please log in to add and view your appointments.
        </p>
      )}

      {error && (
        <p
          className="mb-4 text-sm text-red-700 bg-red-100 border border-red-300 rounded-xl px-4 py-3"
          role="alert"
        >
          {error}
        </p>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Appointment">
        <form className="space-y-4" onSubmit={handleAddAppointment} noValidate>
          <div>
            <label htmlFor="doctor-name" className="block text-sm font-semibold text-slate-800 mb-2">
              Doctor Name
            </label>
            <input
              id="doctor-name"
              type="text"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:border-indigo-500"
              placeholder="e.g. Dr. Sharma"
              value={doctorName}
              onChange={(e) => setDoctorName(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="hospital" className="block text-sm font-semibold text-slate-800 mb-2">
              Hospital / Clinic
            </label>
            <input
              id="hospital"
              type="text"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:border-indigo-500"
              placeholder="e.g. City Hospital"
              value={hospital}
              onChange={(e) => setHospital(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="appointment-date" className="block text-sm font-semibold text-slate-800 mb-2">
                Date
              </label>
              <input
                id="appointment-date"
                type="date"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:border-indigo-500"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="appointment-time" className="block text-sm font-semibold text-slate-800 mb-2">
                Time
              </label>
              <input
                id="appointment-time"
                type="time"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:border-indigo-500"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full py-3 text-sm font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition disabled:opacity-70 disabled:cursor-not-allowed"
            disabled={!user || isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save Appointment'}
          </button>
        </form>
      </Modal>

      {loading ? (
        <p className="text-sm text-slate-600">Loading appointments…</p>
      ) : appointments.length === 0 ? (
        <p className={`${cardClass} text-sm text-slate-600`}>
          {user ? 'No data available' : 'Log in to see your appointments.'}
        </p>
      ) : (
        <ul className="space-y-4">
          {appointments.map((appt) => (
            <li key={appt.id} className={cardClass}>
              <p className="font-semibold text-slate-900">{appt.doctorName}</p>
              <p className="text-sm text-slate-700">Date: {appt.date}</p>
              <p className="text-sm text-slate-700">Time: {appt.time}</p>
              {appt.hospital && <p className="text-sm text-slate-700">Hospital: {appt.hospital}</p>}
            </li>
          ))}
        </ul>
      )}
    </AppLayout>
  );
}
