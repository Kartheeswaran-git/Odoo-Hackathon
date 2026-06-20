import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function SignUpPage() {
  const { signup } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function set(field) {
    return (e) => setForm((cur) => ({ ...cur, [field]: e.target.value }));
  }

  async function submit(event) {
    event.preventDefault();
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await signup(form.name, form.email, form.password);
      setMessage('Account created successfully! Wait for an Admin to activate your access, then sign in.');
    } catch (signUpError) {
      const msg = signUpError.message ?? 'Something went wrong.';
      // Friendlier messages for common Supabase errors
      if (msg.toLowerCase().includes('rate limit') || msg.toLowerCase().includes('email')) {
        setError('Too many signup attempts. Please wait a few minutes and try again.');
      } else if (msg.toLowerCase().includes('already')) {
        setError('An account with this email already exists. Try signing in instead.');
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls = 'mt-1.5 block w-full rounded-md border border-slate-300 px-3 py-2.5 text-slate-800 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100';

  return (
    <main className="min-h-screen bg-slate-50 p-5 sm:grid sm:place-items-center">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl sm:grid-cols-2">
        {/* Left panel */}
        <section className="bg-slate-900 p-8 text-slate-300 sm:p-10">
          <p className="text-sm font-bold uppercase tracking-widest text-orange-500">Shiv Furniture Works</p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-white">Create your staff account.</h1>
          <p className="mt-4 leading-7">
            New accounts are inactive by default. An administrator grants only the ERP modules and actions needed for your role.
          </p>
          <div className="mt-8 space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white">1</span>
              <span>Create your account below</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-slate-700 text-xs font-bold text-slate-300">2</span>
              <span>Admin activates your account &amp; assigns modules</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-slate-700 text-xs font-bold text-slate-300">3</span>
              <span>Sign in and start working</span>
            </div>
          </div>
        </section>

        {/* Right panel */}
        <section className="p-8 sm:p-10">
          <h2 className="text-2xl font-bold text-slate-800">Sign up</h2>
          <p className="mt-1 text-sm text-slate-500">Use your work email to request ERP access.</p>

          {/* Success */}
          {message && (
            <div role="status" className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
              ✅ {message}
              <p className="mt-2">
                <Link to="/login" className="font-semibold text-green-700 underline hover:text-green-900">
                  Go to Sign In →
                </Link>
              </p>
            </div>
          )}

          {!message && (
            <form className="mt-5 space-y-4" onSubmit={(e) => void submit(e)}>
              <label className="block text-sm font-medium text-slate-700">
                Full Name
                <input
                  required
                  value={form.name}
                  onChange={set('name')}
                  placeholder="Your full name"
                  className={inputCls}
                />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Email
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={set('email')}
                  placeholder="you@company.com"
                  className={inputCls}
                />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Password
                <input
                  type="password"
                  minLength={6}
                  required
                  value={form.password}
                  onChange={set('password')}
                  placeholder="At least 6 characters"
                  className={inputCls}
                />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Confirm Password
                <input
                  type="password"
                  minLength={6}
                  required
                  value={form.confirmPassword}
                  onChange={set('confirmPassword')}
                  placeholder="Repeat password"
                  className={inputCls}
                />
              </label>

              {/* Error */}
              {error && (
                <div role="alert" className="flex items-start gap-2 rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-orange-800">
                  <span className="mt-0.5 flex-shrink-0">⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-md bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'Creating account…' : 'Create account'}
              </button>
            </form>
          )}

          <p className="mt-5 text-sm text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-orange-500 hover:text-orange-600">
              Sign in
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
