import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';

export default function CaregiverRegister() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');

        if (!name || !email || !phone || !password || !confirmPassword) {
            setError('Please fill in all fields.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        if (password.length < 6) {
            setError('Password should be at least 6 characters long.');
            return;
        }

        setIsSubmitting(true);
        try {
            // Create user with Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
            const user = userCredential.user;

            // Store caregiver details in Firestore
            const caregiverRef = doc(collection(db, 'caregivers'), user.uid);
            await setDoc(caregiverRef, {
                name: name.trim(),
                email: email.trim(),
                phone: phone.trim(),
                role: 'caregiver',
                createdAt: Date.now(),
            });

            // Redirect to the login page
            navigate('/login');
        } catch (err) {
            if (err?.code === 'auth/email-already-in-use') {
                setError('This email is already registered. Please log in instead.');
            } else {
                setError('Unable to create your account. Please check your details and try again.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col items-center justify-center px-6 py-12">
            <div className="w-full max-w-md">
                <h1 className="text-3xl font-bold text-slate-900 mb-2 text-center">Caregiver Registration</h1>
                <p className="text-lg text-slate-600 mb-4 text-center">Create a caregiver account</p>

                <form className="space-y-5" onSubmit={handleSubmit} noValidate>
                    <div>
                        <label htmlFor="name" className="block text-lg font-semibold text-slate-800 mb-2">
                            Full Name
                        </label>
                        <input
                            id="name"
                            type="text"
                            autoComplete="name"
                            className="w-full px-4 py-3 text-lg rounded-xl border-2 border-slate-300 focus:border-indigo-500"
                            placeholder="Your name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    <div>
                        <label htmlFor="email" className="block text-lg font-semibold text-slate-800 mb-2">
                            Email
                        </label>
                        <input
                            id="email"
                            type="email"
                            autoComplete="email"
                            className="w-full px-4 py-3 text-lg rounded-xl border-2 border-slate-300 focus:border-indigo-500"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div>
                        <label htmlFor="phone" className="block text-lg font-semibold text-slate-800 mb-2">
                            Phone Number
                        </label>
                        <input
                            id="phone"
                            type="tel"
                            autoComplete="tel"
                            className="w-full px-4 py-3 text-lg rounded-xl border-2 border-slate-300 focus:border-indigo-500"
                            placeholder="Your phone number"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                        />
                    </div>

                    <div>
                        <label htmlFor="password" className="block text-lg font-semibold text-slate-800 mb-2">
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            autoComplete="new-password"
                            className="w-full px-4 py-3 text-lg rounded-xl border-2 border-slate-300 focus:border-indigo-500"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    <div>
                        <label htmlFor="confirmPassword" className="block text-lg font-semibold text-slate-800 mb-2">
                            Confirm Password
                        </label>
                        <input
                            id="confirmPassword"
                            type="password"
                            autoComplete="new-password"
                            className="w-full px-4 py-3 text-lg rounded-xl border-2 border-slate-300 focus:border-indigo-500"
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                    </div>

                    {error && (
                        <p
                            className="mt-1 text-red-700 bg-red-100 border border-red-300 rounded-xl px-4 py-3 text-lg"
                            role="alert"
                        >
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        className="w-full mt-2 py-4 text-xl font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition disabled:opacity-70 disabled:cursor-not-allowed"
                        disabled={isSubmitting}
                        aria-busy={isSubmitting}
                    >
                        {isSubmitting ? 'Creating account…' : 'Create Account'}
                    </button>
                </form>

                <p className="mt-6 text-center text-lg">
                    <Link to="/caregiver-login" className="text-indigo-600 font-semibold hover:underline">
                        Already have an account? Sign in
                    </Link>
                </p>
                <p className="mt-4 text-center">
                    <Link to="/" className="text-slate-600 hover:underline text-lg">← Back to Home</Link>
                </p>
            </div>
        </div>
    );
}
