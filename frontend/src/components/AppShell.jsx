import { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useModuleAccess } from '../hooks/useModuleAccess';
import { useAuth } from '../hooks/useAuth';

const navigation = [
  ['Dashboard', '/admin', 'dashboard'],
  ['Parties', '/admin/parties', 'parties'],
  ['Products', '/admin/items', 'items'],
  ['Sales order', '/admin/sales', 'sales'],
  ['Purchase order', '/admin/purchases', 'purchases'],
  ['Manufacturing orders', '/admin/manufacturing', 'manufacturing'],
  ['Bill of Materials', '/admin/bill-of-materials', 'bill_of_materials'],

  ['Audit Logs', '/admin/audit-logs', 'audit_logs'],
  ['Manage Users', '/admin/manage-users', 'manage_users'],
  ['Settings', '/admin/settings', 'settings'],
];

function NavigationLinks({ items, canAccess }) {
  return items.filter(([, , module]) => canAccess(module)).map(([label, path]) => <NavLink key={path} to={path} end={path === '/admin'} className={({ isActive }) => `block rounded-md px-3 py-2 text-sm font-medium transition ${isActive ? 'bg-safety text-white' : 'hover:bg-slate-800 hover:text-white'}`}>{label}</NavLink>);
}

function ProfileDropdown({ profile, logout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) { if (!ref.current?.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="relative ml-2" ref={ref}>
      <button 
        onClick={() => setOpen(!open)}
        className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 border-slate-200 bg-slate-100 text-lg shadow-sm transition hover:border-orange-300"
      >
        {profile?.full_name?.charAt(0)?.toUpperCase() || '👤'}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 origin-top-right overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-100 bg-slate-50 px-5 py-4">
            <p className="truncate text-base font-bold text-slate-800">{profile?.full_name || 'No Name'}</p>
            <p className="truncate text-sm text-slate-500">{profile?.email || 'No email provided'}</p>
          </div>
          <div className="px-5 py-3 text-sm">
            <div className="mb-2">
              <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Mobile Number</span>
              <span className="text-slate-700">{profile?.phone || '—'}</span>
            </div>
            <div>
              <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Address</span>
              <span className="text-slate-700">{profile?.address || '—'}</span>
            </div>
          </div>
          <div className="border-t border-slate-100 bg-slate-50 p-2 text-right">
            <button onClick={() => void logout()} className="w-full text-left rounded-lg px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50">
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AppShell() {
  const navigate = useNavigate();
  const { can, canAccess, role } = useModuleAccess();
  const { profile, logout } = useAuth();
  return (
    <div className="min-h-screen bg-white lg:grid lg:grid-cols-[15rem_1fr]">
      <aside className="bg-slate-900 px-5 py-6 text-slate-300 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto">
        <div className="mb-8 text-xl font-bold tracking-tight text-white">Shiv Furniture <span className="text-safety">Works</span></div>
        <nav className="space-y-1" aria-label="Main navigation">
          <NavigationLinks items={navigation} canAccess={canAccess} />
        </nav>
        <div className="mt-8 border-t border-slate-700 pt-5 text-xs text-slate-500">Central manufacturing backbone</div>
      </aside>
      <section className="min-w-0">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
          <div className="text-sm font-medium text-slate-500">Operations / <span className="text-slate-800">{role ?? 'Sign in required'}</span></div>
          <div className="flex items-center gap-2">
            {canAccess('sales') && can('sales', 'create') && <button type="button" onClick={() => navigate(`/admin/sales?new=${Date.now()}`)} className="rounded-md bg-safety px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-safety-dark focus:outline-none focus:ring-2 focus:ring-safety focus:ring-offset-2">New order</button>}
            <ProfileDropdown profile={profile} logout={logout} />
          </div>
        </header>
        <main className="p-6 lg:p-8"><Outlet /></main>
      </section>
    </div>
  );
}
