import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loginWithEmail } from '../services/auth';

export default function CaregiverLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      await loginWithEmail(email.trim(), password);
      navigate('/caregiver-dashboard');
    } catch (err) {
      setError('Unable to sign in. Please check your details and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-slate-900 mb-2 text-center">Caregiver Login</h1>
        <p className="text-lg text-slate-600 mb-4 text-center">
          Sign in to view and respond to SOS alerts
        </p>

        <form className="space-y-5" onSubmit={handleSubmit} noValidate>
          <div>
            <label htmlFor="caregiver-email" className="block text-lg font-semibold text-slate-800 mb-2">
              Email
            </label>
            <input
              id="caregiver-email"
              type="email"
              autoComplete="email"
              className="w-full px-4 py-3 text-lg rounded-xl border-2 border-slate-300 focus:border-indigo-500"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="caregiver-password" className="block text-lg font-semibold text-slate-800 mb-2">
              Password
            </label>
            <input
              id="caregiver-password"
              type="password"
              autoComplete="current-password"
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
            {isSubmitting ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="mt-6 text-center text-lg">
          <span className="text-slate-600">Don't have an account? </span>
          <Link to="/caregiver-register" className="text-indigo-600 font-semibold hover:underline">
            Register here
          </Link>
        </p>
        <p className="mt-2 text-center text-lg">
          <Link to="/login" className="text-indigo-600 font-semibold hover:underline">
            Elder Login
          </Link>
        </p>
        <p className="mt-4 text-center">
          <Link to="/" className="text-slate-600 hover:underline text-lg">← Back to Home</Link>
        </p>
      </div>
    </div>
  );
}

