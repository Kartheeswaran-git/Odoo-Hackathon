import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../lib/api';
import { useModuleAccess } from '../hooks/useModuleAccess';

const statusOf = (record) => record?.status ?? record?.data?.status ?? 'Draft';
const count = (records, statuses) => records.filter((record) => statuses.includes(statusOf(record))).length;

function MetricCard({ label, value, note, accent = false, onClick }) {
  return <button type="button" onClick={onClick} className={`group rounded-xl border p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${accent ? 'border-orange-200 bg-orange-50' : 'border-slate-200 bg-white'}`}><div className="flex items-start justify-between gap-4"><div><p className={`text-xs font-bold uppercase tracking-wider ${accent ? 'text-orange-700' : 'text-slate-500'}`}>{label}</p><p className="mt-3 text-3xl font-black tracking-tight text-slate-900">{value}</p></div><span className={`grid h-9 w-9 place-items-center rounded-lg text-lg ${accent ? 'bg-safety text-white' : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'}`}>↗</span></div><p className="mt-3 text-sm text-slate-500">{note}</p></button>;
}

function StatusRow({ label, value, total, color = 'bg-safety' }) {
  const width = total ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return <div><div className="mb-2 flex items-center justify-between text-sm"><span className="font-medium text-slate-600">{label}</span><span className="font-bold tabular-nums text-slate-800">{value}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${color}`} style={{ width: `${width}%` }} /></div></div>;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { canAccess } = useModuleAccess();
  const [sales, setSales] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [manufacturing, setManufacturing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.salesOrders(), api.module('purchases'), api.module('manufacturing')])
      .then(([salesData, purchaseData, manufacturingData]) => { setSales(salesData ?? []); setPurchases(purchaseData ?? []); setManufacturing(manufacturingData ?? []); })
      .catch((loadError) => setError(loadError.message))
      .finally(() => setLoading(false));
  }, []);

  const figures = useMemo(() => {
    const salesDraft = count(sales, ['Draft']);
    const salesActive = count(sales, ['Confirmed', 'Partially Delivered']);
    const salesDone = count(sales, ['Fully Delivered', 'Completed']);
    const purchaseDraft = count(purchases, ['Draft']);
    const purchaseActive = count(purchases, ['Confirmed', 'Partially Received']);
    const purchaseDone = count(purchases, ['Received', 'Fully Received', 'Completed']);
    const manufacturingDraft = count(manufacturing, ['Draft']);
    const manufacturingActive = count(manufacturing, ['Confirmed', 'In Progress', 'To Close']);
    const manufacturingDone = count(manufacturing, ['Done', 'Completed']);
    return { salesDraft, salesActive, salesDone, purchaseDraft, purchaseActive, purchaseDone, manufacturingDraft, manufacturingActive, manufacturingDone };
  }, [manufacturing, purchases, sales]);

  const chartData = [
    { operation: 'Sales', Draft: figures.salesDraft, Active: figures.salesActive, Completed: figures.salesDone },
    { operation: 'Purchases', Draft: figures.purchaseDraft, Active: figures.purchaseActive, Completed: figures.purchaseDone },
    { operation: 'Manufacturing', Draft: figures.manufacturingDraft, Active: figures.manufacturingActive, Completed: figures.manufacturingDone },
  ];
  const pendingDemand = figures.salesDraft + figures.salesActive;
  const activeSupply = figures.purchaseActive + figures.manufacturingActive;
  const completed = figures.salesDone + figures.purchaseDone + figures.manufacturingDone;
  const totalOperations = sales.length + purchases.length + manufacturing.length;

  return <section className="space-y-7">
    <header className="overflow-hidden rounded-2xl bg-slate-900 px-6 py-7 text-white shadow-sm lg:px-8"><div className="flex flex-col justify-between gap-6 md:flex-row md:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.22em] text-orange-400">Operational command centre</p><h1 className="mt-3 text-3xl font-black tracking-tight">Good work starts with a clear view.</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Demand, procurement, and production status across Shiv Furniture Works.</p></div></div></header>

    {error && <div role="alert" className="rounded-lg border border-orange-200 bg-orange-50 p-4 text-sm text-orange-800">{error}</div>}

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="Pending demand" value={loading ? '—' : pendingDemand} note="Draft and confirmed sales" accent onClick={() => navigate('/admin/sales')} />
      <MetricCard label="Active supply" value={loading ? '—' : activeSupply} note="Purchasing and production" onClick={() => navigate(canAccess('purchases') ? '/admin/purchases' : '/admin/manufacturing')} />
      <MetricCard label="Completed flow" value={loading ? '—' : completed} note="Closed operational records" />
      <MetricCard label="Open production" value={loading ? '—' : figures.manufacturingActive} note="Currently on the floor" onClick={() => navigate('/admin/manufacturing')} />
    </div>

    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(18rem,0.75fr)]">
      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="mb-6 flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-safety">Live comparison</p><h2 className="mt-1 text-xl font-bold text-slate-800">Operational Overview</h2><p className="mt-1 text-sm text-slate-500">Order volume by current workflow stage.</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">Real-time</span></div><div className="h-[22rem] w-full">{loading ? <div className="grid h-full place-items-center text-sm text-slate-400">Loading operational data…</div> : <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}><LineChart data={chartData} margin={{ top: 12, right: 14, left: -22, bottom: 2 }}><CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false} /><XAxis dataKey="operation" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} /><YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} /><Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 12px 24px rgba(15,23,42,.08)' }} /><Legend iconType="circle" wrapperStyle={{ paddingTop: 20, fontSize: 12 }} /><Line type="monotone" dataKey="Draft" stroke="#94a3b8" strokeWidth={3} dot={{ r: 4, fill: '#94a3b8' }} activeDot={{ r: 6 }} /><Line type="monotone" dataKey="Active" stroke="#f97316" strokeWidth={3} dot={{ r: 4, fill: '#f97316' }} activeDot={{ r: 6 }} /><Line type="monotone" dataKey="Completed" stroke="#1e293b" strokeWidth={3} dot={{ r: 4, fill: '#1e293b' }} activeDot={{ r: 6 }} /></LineChart></ResponsiveContainer>}</div></article>

      <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Workflow health</p><h2 className="mt-1 text-xl font-bold text-slate-800">Work in progress</h2><div className="mt-7 space-y-6"><StatusRow label="Sales demand" value={pendingDemand} total={Math.max(totalOperations, 1)} /><StatusRow label="Purchase orders" value={figures.purchaseDraft + figures.purchaseActive} total={Math.max(totalOperations, 1)} color="bg-slate-500" /><StatusRow label="Manufacturing" value={figures.manufacturingDraft + figures.manufacturingActive} total={Math.max(totalOperations, 1)} color="bg-slate-800" /></div><div className="mt-8 rounded-xl bg-orange-50 p-4"><p className="text-xs font-bold uppercase tracking-wider text-orange-700">Focus</p><p className="mt-2 text-sm leading-6 text-orange-900">{pendingDemand > activeSupply ? 'Customer demand is ahead of active supply. Review procurement and production capacity.' : 'Supply activity is keeping pace with current customer demand.'}</p></div></aside>
    </div>
  </section>;
}
