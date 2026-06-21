import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useModuleAccess } from '../hooks/useModuleAccess';

export default function AuditLogsPage() {
  const { can } = useModuleAccess();
  const [searchParams] = useSearchParams();
  const [logs, setLogs] = useState([]);
  const [metrics, setMetrics] = useState({ Total: 0, Created: 0, Updated: 0, Deleted: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [userFilter, setUserFilter] = useState('All Users');
  const [moduleFilter, setModuleFilter] = useState(searchParams.get('module') || 'All Modules');
  const [actionFilter, setActionFilter] = useState('All Actions');

  useEffect(() => {
    loadLogs();
  }, []);

  useEffect(() => {
    setModuleFilter(searchParams.get('module') || 'All Modules');
  }, [searchParams]);

  async function loadLogs() {
    if (!can('audit_logs', 'view')) return;
    setLoading(true);
    try {
      const data = await api.auditLogs();
      setLogs(data.logs || []);
      setMetrics(data.metrics || { Total: 0, Created: 0, Updated: 0, Deleted: 0 });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const resetFilters = () => {
    setUserFilter('All Users');
    setModuleFilter('All Modules');
    setActionFilter('All Actions');
  };

  const filteredLogs = logs.filter(log => {
    if (userFilter !== 'All Users' && log.user !== userFilter) return false;
    if (moduleFilter !== 'All Modules' && log.module !== moduleFilter) return false;
    if (actionFilter !== 'All Actions' && log.action !== actionFilter) return false;
    return true;
  });

  const uniqueUsers = ['All Users', ...new Set(logs.map(l => l.user).filter(Boolean))];
  const uniqueModules = ['All Modules', ...new Set(logs.map(l => l.module).filter(Boolean))];
  const uniqueActions = ['All Actions', ...new Set(logs.map(l => l.action).filter(Boolean))];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-800">Audit Logs</h1>
        <p className="text-sm text-slate-500">Track all fields and changes across the ERP modules.</p>
      </header>

      {error && <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 text-center">
          <p className="text-sm font-semibold text-blue-700">Total Logs</p>
          <p className="mt-1 text-3xl font-bold text-blue-900">{metrics.Total}</p>
          <p className="mt-1 text-xs text-blue-600">All time logs</p>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 p-5 text-center">
          <p className="text-sm font-semibold text-green-700">Create Actions</p>
          <p className="mt-1 text-3xl font-bold text-green-900">{metrics.Created}</p>
          <p className="mt-1 text-xs text-green-600">Records Created</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-center">
          <p className="text-sm font-semibold text-amber-700">Update Actions</p>
          <p className="mt-1 text-3xl font-bold text-amber-900">{metrics.Updated}</p>
          <p className="mt-1 text-xs text-amber-600">Records Updated</p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-center">
          <p className="text-sm font-semibold text-red-700">Delete Actions</p>
          <p className="mt-1 text-3xl font-bold text-red-900">{metrics.Deleted}</p>
          <p className="mt-1 text-xs text-red-600">Records Deleted</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col">
          <label className="mb-1 text-xs font-semibold text-slate-500">User</label>
          <select value={userFilter} onChange={e => setUserFilter(e.target.value)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-800 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500">
            {uniqueUsers.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div className="flex flex-col">
          <label className="mb-1 text-xs font-semibold text-slate-500">Module</label>
          <select value={moduleFilter} onChange={e => setModuleFilter(e.target.value)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-800 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500">
            {uniqueModules.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div className="flex flex-col">
          <label className="mb-1 text-xs font-semibold text-slate-500">Actions</label>
          <select value={actionFilter} onChange={e => setActionFilter(e.target.value)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-800 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500">
            {uniqueActions.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div className="flex items-end gap-2 ml-auto mt-4 sm:mt-0">
          <button onClick={resetFilters} className="rounded-md border border-slate-300 px-4 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Reset</button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[64rem] text-left text-sm">
            <thead className="bg-slate-900 text-xs uppercase tracking-wider text-slate-300">
              <tr>
                <th className="px-5 py-3 font-semibold">Date & Time</th>
                <th className="px-5 py-3 font-semibold">User</th>
                <th className="px-5 py-3 font-semibold">Module</th>
                <th className="px-5 py-3 font-semibold">Record Type</th>
                <th className="px-5 py-3 font-semibold">Record ID</th>
                <th className="px-5 py-3 font-semibold">Action</th>
                <th className="px-5 py-3 font-semibold">Field Changed</th>
                <th className="px-5 py-3 font-semibold">Old Value</th>
                <th className="px-5 py-3 font-semibold">New Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={9} className="px-5 py-10 text-center text-slate-500">Loading audit logs…</td></tr>
              ) : filteredLogs.length ? (
                filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4 whitespace-nowrap text-slate-600">{log.date_time}</td>
                    <td className="px-5 py-4 whitespace-nowrap font-medium text-slate-800">{log.user}</td>
                    <td className="px-5 py-4 whitespace-nowrap text-slate-600">{log.module}</td>
                    <td className="px-5 py-4 whitespace-nowrap text-slate-600">{log.record_type}</td>
                    <td className="px-5 py-4 whitespace-nowrap font-mono text-slate-500 text-xs">{log.record_id ? `${log.record_id.slice(0, 8)}...` : '—'}</td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className={`font-semibold ${log.action === 'Created' ? 'text-green-600' : log.action === 'Updated' ? 'text-amber-600' : 'text-red-600'}`}>{log.action}</span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-slate-600">{log.field_changed}</td>
                    <td className="px-5 py-4 whitespace-nowrap text-slate-500">{String(log.old_value)}</td>
                    <td className="px-5 py-4 whitespace-nowrap text-slate-800 font-medium">{String(log.new_value)}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={9} className="px-5 py-10 text-center text-slate-500">No logs found matching your criteria.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
