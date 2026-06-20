import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { useModuleAccess } from '../hooks/useModuleAccess';

const fmt = (n) => new Intl.NumberFormat('en-IN').format(Number(n));

export default function Dashboard() {
  const navigate = useNavigate();
  const { canAccess, can } = useModuleAccess();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.salesOrders()
      .then((d) => setOrders(d ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const total   = orders.length;
  const draft   = orders.filter((o) => o.status === 'Draft').length;
  const confirmed = orders.filter((o) => o.status === 'Confirmed').length;

  const metrics = [
    { label: 'Total Sales Orders', value: loading ? '…' : fmt(total),     sub: 'All time',          color: 'from-orange-400 to-orange-600',   icon: '📋' },
    { label: 'Draft Orders',       value: loading ? '…' : fmt(draft),     sub: 'Awaiting confirmation', color: 'from-amber-400 to-amber-600',  icon: '✏️' },
    { label: 'Confirmed Orders',   value: loading ? '…' : fmt(confirmed), sub: 'Stock reserved',    color: 'from-emerald-400 to-emerald-600', icon: '✅' },
    { label: 'Active Modules',     value: '9',                             sub: 'Enabled',           color: 'from-blue-400 to-blue-600',       icon: '⚡' },
  ];

  return (
    <section>
      {/* Header */}
      <div className="mb-8">
        <p className="mb-1 text-sm font-semibold text-orange-500">Business Overview</p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Live view of operational activity.</p>
      </div>

      {/* Metric cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value, sub, color, icon }) => (
          <article
            key={label}
            className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
          >
            <div className={`absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${color} text-xl shadow-sm`}>
              {icon}
            </div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
            <p className="mt-2 text-3xl font-bold text-slate-800">{value}</p>
            <p className="mt-1 text-xs text-slate-400">{sub}</p>
          </article>
        ))}
      </div>

      {/* Quick actions */}
      <div className="mb-8">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          {canAccess('sales') && can('sales', 'create') && (
            <button
              onClick={() => navigate('/admin/sales?new=1')}
              className="flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600"
            >
              📋 New Sales Order
            </button>
          )}
          {canAccess('parties') && (
            <button
              onClick={() => navigate('/admin/parties')}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              👥 View Parties
            </button>
          )}
          {canAccess('items') && (
            <button
              onClick={() => navigate('/admin/items')}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              📦 View Products
            </button>
          )}
          {canAccess('purchases') && (
            <button
              onClick={() => navigate('/admin/purchases')}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              🛒 Purchases
            </button>
          )}
        </div>
      </div>

      {/* Recent Sales Orders */}
      <div>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">Recent Sales Orders</h2>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900 text-xs uppercase tracking-wider text-slate-300">
              <tr>
                <th className="px-5 py-3 font-semibold">S.No</th>
                <th className="px-5 py-3 font-semibold">Bill No</th>
                <th className="px-5 py-3 font-semibold">Customer</th>
                <th className="px-5 py-3 font-semibold">Date</th>
                <th className="px-5 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-400">Loading…</td></tr>
              ) : orders.slice(0, 5).length ? (
                orders.slice(0, 5).map((o, idx) => (
                  <tr key={o.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 text-slate-400">{idx + 1}</td>
                    <td className="px-5 py-3 font-mono font-semibold text-slate-800">
                      {o.order_number ? `SO-${o.order_number}` : '—'}
                    </td>
                    <td className="px-5 py-3 text-slate-700">{o.customer_name}</td>
                    <td className="px-5 py-3 text-slate-500">
                      {o.created_at ? new Date(o.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${o.status === 'Confirmed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                        {o.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-400">No sales orders yet. Create one to get started.</td></tr>
              )}
            </tbody>
          </table>
          {orders.length > 5 && (
            <div className="border-t border-slate-100 px-5 py-3">
              <button onClick={() => navigate('/admin/sales')} className="text-sm font-semibold text-orange-500 hover:text-orange-600">
                View all {orders.length} orders →
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
