import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { doc, setDoc, collection } from 'firebase/firestore';
import { db } from '../services/firebase';
import { registerWithEmail } from '../services/auth';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!name || !email || !password) {
      setError('Please fill in your name, email, and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const user = await registerWithEmail(email.trim(), password);

      const elderRef = doc(collection(db, 'elders'), user.uid);
      await setDoc(elderRef, {
        name,
        email: email.trim(),
        role: 'elder',
        createdAt: Date.now(),
      });

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
        <h1 className="text-3xl font-bold text-slate-900 mb-2 text-center">Register</h1>
        <p className="text-lg text-slate-600 mb-4 text-center">Create your account</p>

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
          <Link to="/login" className="text-indigo-600 font-semibold hover:underline">
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
