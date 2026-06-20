import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function LoginPage() {
  const { authUser, profile, loading, login, configurationError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && authUser && profile?.active) navigate(location.state?.from?.pathname ?? '/admin', { replace: true });
  }, [authUser, loading, location.state, navigate, profile]);

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try { await login(email, password); } catch (loginError) { setError(loginError instanceof Error ? loginError.message : 'Could not sign in.'); } finally { setSubmitting(false); }
  }

  return <main className="min-h-screen bg-white p-5 sm:grid sm:place-items-center">
    <div className="grid w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl sm:grid-cols-2">
      <section className="bg-slate-900 p-8 text-slate-300 sm:p-10"><p className="text-sm font-bold uppercase tracking-widest text-safety">Shiv Furniture Works</p><h1 className="mt-4 text-3xl font-bold tracking-tight text-white">One connected operations workspace.</h1><p className="mt-4 leading-7 text-slate-300">Manage furniture sales, purchasing, manufacturing, inventory, and finance from a single reliable source of truth.</p><ul className="mt-8 space-y-3 text-sm"><li>• Role-based ERP access</li><li>• Live inventory availability</li><li>• Make-to-order procurement automation</li></ul></section>
      <section className="p-8 sm:p-10"><h2 className="text-2xl font-bold text-slate-800">Welcome back</h2><p className="mt-2 text-sm text-slate-500">Sign in with your Supabase email and password.</p><form className="mt-7 space-y-5" onSubmit={(event) => void submit(event)}><label className="block text-sm font-medium text-slate-700">Email<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@company.com" className="mt-1.5 block w-full rounded-md border border-slate-300 px-3 py-2.5 text-slate-800 outline-none focus:border-safety focus:ring-2 focus:ring-orange-100" /></label><label className="block text-sm font-medium text-slate-700">Password<input type="password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" className="mt-1.5 block w-full rounded-md border border-slate-300 px-3 py-2.5 text-slate-800 outline-none focus:border-safety focus:ring-2 focus:ring-orange-100" /></label>{!loading && authUser && profile && !profile.active && <p role="alert" className="rounded-md border border-orange-200 bg-orange-50 p-3 text-sm text-orange-800">Your account is waiting for Admin activation. Ask an administrator to grant module access.</p>}{(error || configurationError) && <p role="alert" className="rounded-md border border-orange-200 bg-orange-50 p-3 text-sm text-orange-800">{error || configurationError}</p>}<button type="submit" disabled={submitting || Boolean(configurationError)} className="w-full rounded-md bg-safety px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-safety-dark disabled:cursor-not-allowed disabled:opacity-60">{submitting ? 'Signing in…' : 'Sign in'}</button></form><p className="mt-5 text-sm text-slate-500">New staff member? <Link to="/signup" className="font-semibold text-safety hover:text-safety-dark">Create an account</Link></p></section>
    </div>
  </main>;
}
