import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useModuleAccess } from '../hooks/useModuleAccess';
import { useAuth } from '../hooks/useAuth';

const navigation = [
  ['Dashboard', '/admin', 'dashboard'],
  ['Parties', '/admin/parties', 'parties'],
  ['Products', '/admin/items', 'items'],
  ['Sales', '/admin/sales', 'sales'],
  ['Purchases', '/admin/purchases', 'purchases'],
  ['Manufacturing', '/admin/manufacturing', 'manufacturing'],
  ['Bill of Materials', '/admin/bill-of-materials', 'bill_of_materials'],
  ['Reports', '/admin/reports', 'reports'],
  ['Audit Logs', '/admin/audit-logs', 'audit_logs'],
  ['Manage Users', '/admin/manage-users', 'manage_users'],
  ['Settings', '/admin/settings', 'settings'],
];

function NavigationLinks({ items, canAccess }) {
  return items.filter(([, , module]) => canAccess(module)).map(([label, path]) => <NavLink key={path} to={path} end={path === '/admin'} className={({ isActive }) => `block rounded-md px-3 py-2 text-sm font-medium transition ${isActive ? 'bg-safety text-white' : 'hover:bg-slate-800 hover:text-white'}`}>{label}</NavLink>);
}

export default function AppShell() {
  const navigate = useNavigate();
  const { can, canAccess, role } = useModuleAccess();
  const { logout } = useAuth();
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
          <div className="flex items-center gap-2">{canAccess('sales') && can('sales', 'create') && <button type="button" onClick={() => navigate(`/admin/sales?new=${Date.now()}`)} className="rounded-md bg-safety px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-safety-dark focus:outline-none focus:ring-2 focus:ring-safety focus:ring-offset-2">New order</button>}<button type="button" onClick={() => void logout()} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Sign out</button></div>
        </header>
        <main className="p-6 lg:p-8"><Outlet /></main>
      </section>
    </div>
  );
}
