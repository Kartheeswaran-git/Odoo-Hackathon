import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../hooks/useAuth';

/* ─── Constants ─────────────────────────────────────────────────────────────── */
const MODULES = [
  ['dashboard', 'Dashboard'], ['parties', 'Parties'], ['items', 'Products'],
  ['sales', 'Sales'], ['purchases', 'Purchases'], ['manufacturing', 'Manufacturing'],
  ['reports', 'Reports'], ['settings', 'Settings'], ['manage_users', 'Manage Users'],
];
const ACTIONS = [['can_view', 'View'], ['can_create', 'Create'], ['can_edit', 'Edit'], ['can_delete', 'Delete'], ['can_approve', 'Approve']];
const ROLES = ['Admin', 'Sales', 'Purchase', 'Manufacturing'];

function blankPermission(moduleName) {
  return { module_name: moduleName, can_view: false, can_create: false, can_edit: false, can_delete: false, can_approve: false };
}

/* ─── Small UI helpers ───────────────────────────────────────────────────────── */
const INPUT = 'mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100';
const LABEL = 'block text-xs font-semibold uppercase tracking-wide text-slate-500';

function Field({ label, children }) {
  return (
    <div>
      <p className={LABEL}>{label}</p>
      {children}
    </div>
  );
}

function Alert({ type, children }) {
  const cls = type === 'success'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
    : 'border-red-200 bg-red-50 text-red-800';
  return <div className={`rounded-xl border p-4 text-sm font-medium ${cls}`}>{children}</div>;
}

export default function StaffManagementPage() {
  const { profile: myProfile } = useAuth();
  const [users, setUsers] = useState([]);
  const [allPerms, setAllPerms] = useState([]);
  const [selected, setSelected] = useState(null);
  const [perms, setPerms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [search, setSearch] = useState('');

  async function load() {
    setLoading(true);
    try { const d = await api.staff(); setUsers(d.users ?? []); setAllPerms(d.permissions ?? []); }
    catch (e) { setErr(e.message); }
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);

  function selectUser(user) {
    setSelected({ ...user });
    const current = allPerms.filter((p) => p.user_id === user.id);
    setPerms(MODULES.map(([mod]) => ({ ...blankPermission(mod), ...current.find((p) => p.module_name === mod) })));
    setMsg(''); setErr('');
  }

  function setField(field, value) { setSelected((s) => ({ ...s, [field]: value })); }
  function togglePerm(mod, action, value) {
    setPerms((cur) => cur.map((p) => p.module_name === mod
      ? { ...p, [action]: value, ...(action !== 'can_view' && value ? { can_view: true } : {}) }
      : p));
  }

  async function save() {
    if (!selected) return;
    setSaving(true); setErr('');
    const grantRows = perms.filter((p) => ACTIONS.some(([k]) => p[k])).map((p) => ({ user_id: selected.id, ...p }));
    try {
      await api.saveStaff(selected.id, { role: selected.role, active: selected.active, full_name: selected.full_name, permissions: grantRows });
      setMsg(`${selected.full_name || 'User'} updated successfully.`);
      await load();
      setSelected(null);
      setTimeout(() => setMsg(''), 3000);
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  }

  async function deleteUser(user) {
    if (!confirm(`Delete "${user.full_name}"? This cannot be undone.`)) return;
    setDeleting(user.id); setErr('');
    try {
      await api.deleteStaff(user.id);
      setUsers((cur) => cur.filter((u) => u.id !== user.id));
      if (selected?.id === user.id) setSelected(null);
      setMsg(`${user.full_name || 'User'} deleted.`);
      setTimeout(() => setMsg(''), 3000);
    } catch (e) { setErr(e.message); }
    finally { setDeleting(null); }
  }

  const visible = useMemo(() =>
    search.trim()
      ? users.filter((u) => [u.full_name, u.role].some((v) => String(v ?? '').toLowerCase().includes(search.toLowerCase())))
      : users,
    [users, search]);

  return (
    <section aria-labelledby="staff-title" className="mx-auto max-w-7xl">
      <div className="mb-8">
        <p className="mb-2 text-sm font-bold uppercase tracking-wider text-orange-500">Administration</p>
        <h1 id="staff-title" className="text-3xl font-black tracking-tight text-slate-900">User Management</h1>
        <p className="mt-2 text-base text-slate-500">Activate staff accounts, assign roles, and configure precise module permissions.</p>
      </div>

      {/* Alerts */}
      <div className="sticky top-4 z-10 mb-8 empty:hidden">
        {msg && <Alert type="success">✓ {msg}</Alert>}
        {err && <Alert type="error">! {err}</Alert>}
      </div>

      <div className="grid items-start gap-8 xl:grid-cols-[1fr_1.6fr]">
        {/* ── User list ── */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
            <p className="text-base font-bold text-slate-800">All Users</p>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{users.length}</span>
          </div>
          <div className="border-b border-slate-100 p-4">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or role…"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-100"
              />
            </div>
          </div>
          <div className="divide-y divide-slate-50">
            {loading ? (
              <p className="px-6 py-12 text-center text-sm text-slate-400">Loading users…</p>
            ) : visible.map((user) => {
              const isMe = user.id === myProfile?.id;
              const isSelected = selected?.id === user.id;
              return (
                <div
                  key={user.id}
                  className={`flex items-center justify-between gap-4 px-6 py-4 transition ${isSelected ? 'bg-orange-50/50' : 'hover:bg-slate-50'}`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-inner ${isSelected ? 'bg-orange-500' : 'bg-slate-300'}`}>
                        {(user.full_name || '?').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="truncate text-sm font-bold text-slate-800">
                          {user.full_name || <span className="italic text-slate-400">No name</span>}
                          {isMe && <span className="ml-2 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-black uppercase text-orange-600">You</span>}
                        </p>
                        <p className="text-xs font-medium text-slate-500">{user.role} <span className="mx-1 opacity-50">•</span> {user.active ? <span className="text-emerald-600">Active</span> : <span className="text-orange-500">Pending</span>}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 gap-2">
                    <button
                      onClick={() => selectUser(user)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${isSelected ? 'bg-orange-500 text-white shadow-md' : 'border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-white'}`}
                    >
                      Edit
                    </button>
                    {!isMe && (
                      <button
                        onClick={() => void deleteUser(user)}
                        disabled={deleting === user.id}
                        className="rounded-lg border border-red-100 px-3 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                      >
                        {deleting === user.id ? '…' : 'Delete'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {!loading && !visible.length && (
              <p className="px-6 py-12 text-center text-sm text-slate-400">No users found.</p>
            )}
          </div>
        </div>

        {/* ── Edit panel ── */}
        {selected ? (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-200/50">
            <div className="flex items-center justify-between border-b border-slate-100 px-8 py-6">
              <div>
                <p className="text-lg font-bold text-slate-800">Edit User</p>
                <p className="text-sm text-slate-500">Changes apply on next sign-in.</p>
              </div>
              <button onClick={() => setSelected(null)} className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">✕</button>
            </div>

            <div className="space-y-8 p-8">
              {/* Name & Role */}
              <div className="grid gap-6 sm:grid-cols-2">
                <Field label="Full Name">
                  <input
                    value={selected.full_name ?? ''}
                    onChange={(e) => setField('full_name', e.target.value)}
                    className={INPUT}
                    placeholder="Full name"
                  />
                </Field>

                <Field label="ERP Role">
                  <select
                    value={selected.role}
                    onChange={(e) => setField('role', e.target.value)}
                    className={INPUT}
                  >
                    {ROLES.map((r) => <option key={r}>{r}</option>)}
                  </select>
                </Field>
              </div>

              {/* Active toggle */}
              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200 p-4 transition hover:bg-slate-50">
                <div>
                  <p className="text-sm font-bold text-slate-800">Account Status</p>
                  <p className="text-xs text-slate-500">Inactive users cannot log in.</p>
                </div>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={Boolean(selected.active)}
                    onChange={(e) => setField('active', e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`h-6 w-11 rounded-full transition-colors ${selected.active ? 'bg-orange-500' : 'bg-slate-300'}`} />
                  <div className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${selected.active ? 'translate-x-6' : 'translate-x-1'}`} />
                </div>
              </label>

              {/* Module Permissions */}
              <div>
                <p className={`${LABEL} mb-3`}>Module Permissions</p>
                <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[40rem] text-left text-sm">
                      <thead className="bg-slate-50 text-slate-600">
                        <tr>
                          <th className="px-4 py-3 font-bold uppercase tracking-wider text-xs">Module</th>
                          {ACTIONS.map(([, label]) => (
                            <th key={label} className="px-4 py-3 text-center font-bold uppercase tracking-wider text-xs">{label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {perms.map((perm) => (
                          <tr key={perm.module_name} className="transition hover:bg-slate-50">
                            <td className="px-4 py-3 font-semibold text-slate-700">
                              {MODULES.find(([k]) => k === perm.module_name)?.[1]}
                            </td>
                            {ACTIONS.map(([key]) => (
                              <td key={key} className="px-4 py-3 text-center">
                                <div className="flex justify-center">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(perm[key])}
                                    onChange={(e) => togglePerm(perm.module_name, key, e.target.checked)}
                                    className="h-5 w-5 cursor-pointer accent-orange-500"
                                  />
                                </div>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-6">
                <button onClick={() => setSelected(null)} className="rounded-xl border border-slate-200 px-6 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50">
                  Cancel
                </button>
                <button
                  disabled={saving}
                  onClick={() => void save()}
                  className="rounded-xl bg-orange-500 px-8 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-orange-600 disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-16 text-center">
            <h3 className="text-lg font-bold text-slate-800">Select a user</h3>
            <p className="mt-2 max-w-xs text-sm text-slate-500">Choose a user from the list to edit their profile, role, and module access.</p>
          </div>
        )}
      </div>
    </section>
  );
}
