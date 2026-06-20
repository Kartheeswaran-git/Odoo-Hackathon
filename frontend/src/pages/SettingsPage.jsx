import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../hooks/useAuth';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const FY_OPTIONS = MONTHS.map((m, i) => [String(i + 1).padStart(2, '0'), m]);

const INPUT = 'mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/10 hover:bg-slate-50';
const LABEL = 'block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5';

function Field({ label, children }) {
  return (
    <div>
      <label className={LABEL}>{label}</label>
      {children}
    </div>
  );
}

function Section({ title, description, children }) {
  return (
    <div className="grid gap-8 border-b border-slate-100 py-10 last:border-0 lg:grid-cols-3">
      <div className="lg:pr-8">
        <h3 className="text-base font-bold text-slate-800">{title}</h3>
        {description && <p className="mt-2 text-sm leading-relaxed text-slate-500">{description}</p>}
      </div>
      <div className="lg:col-span-2">
        <div className="grid gap-6 sm:grid-cols-2">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { profile } = useAuth();
  const [settings, setSettings] = useState(null);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    if (profile?.role === 'Admin') {
      api.getSettings()
        .then((s) => { setSettings(s); setDraft(s); })
        .catch((e) => setErr(e.message));
    }
  }, [profile?.role]);

  function set(field, value) { setDraft((d) => ({ ...d, [field]: value })); }

  async function save(e) {
    e.preventDefault();
    setSaving(true); setMsg(''); setErr('');
    try {
      const saved = await api.saveSettings(draft);
      setSettings(saved); setDraft(saved);
      setMsg('Settings saved successfully.');
      setTimeout(() => setMsg(''), 3000);
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  }

  // Gate: Admin only
  if (profile?.role !== 'Admin') {
    return (
      <section className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-4xl shadow-inner">
          🔒
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Admin Access Required</h1>
          <p className="mt-2 text-sm text-slate-500">Only administrators can modify company settings.</p>
        </div>
      </section>
    );
  }

  if (!draft) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-orange-500"></div>
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-5xl" aria-labelledby="settings-title">
      {/* Header */}
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-sm font-bold uppercase tracking-wider text-orange-500">Administration</p>
          <h1 id="settings-title" className="text-3xl font-black tracking-tight text-slate-900">Company Settings</h1>
          <p className="mt-2 text-base text-slate-500">Manage your business identity, addresses, and financial preferences.</p>
        </div>
        <div className="flex-shrink-0">
          <button
            type="submit"
            form="settings-form"
            disabled={saving}
            className="rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-slate-900/20 transition-all hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-xl hover:shadow-slate-900/30 disabled:pointer-events-none disabled:opacity-50"
          >
            {saving ? 'Saving changes…' : 'Save all changes'}
          </button>
        </div>
      </div>

      {/* Alerts */}
      <div className="sticky top-4 z-10 mb-8 empty:hidden">
        {msg && (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 shadow-lg shadow-emerald-500/10">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-200 text-emerald-700">✓</span>
            {msg}
          </div>
        )}
        {err && (
          <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800 shadow-lg shadow-red-500/10">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-200 text-red-700">!</span>
            {err}
          </div>
        )}
      </div>

      {/* Main Form */}
      <form id="settings-form" onSubmit={save} className="rounded-2xl border border-slate-200 bg-white px-8 shadow-sm">
        <Section 
          title="Company Identity" 
          description="This information will be displayed on sales orders, purchase orders, and public-facing documents."
        >
          <div className="sm:col-span-2">
            <Field label="Company Name">
              <input required value={draft.company_name} onChange={(e) => set('company_name', e.target.value)} className={INPUT} placeholder="e.g. Shiv Furniture Works" />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Tagline / Slogan">
              <input value={draft.tagline} onChange={(e) => set('tagline', e.target.value)} className={INPUT} placeholder="e.g. Central manufacturing backbone" />
            </Field>
          </div>
          <Field label="Phone Number">
            <input value={draft.phone} onChange={(e) => set('phone', e.target.value)} className={INPUT} placeholder="+91 98765 43210" />
          </Field>
          <Field label="Contact Email">
            <input type="email" value={draft.email} onChange={(e) => set('email', e.target.value)} className={INPUT} placeholder="info@company.com" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Website URL">
              <input type="url" value={draft.website} onChange={(e) => set('website', e.target.value)} className={INPUT} placeholder="https://www.company.com" />
            </Field>
          </div>
        </Section>

        <Section 
          title="Registered Address" 
          description="Your official registered business address. This is required for tax compliance and invoicing."
        >
          <div className="sm:col-span-2">
            <Field label="Street Address / Building">
              <input value={draft.address} onChange={(e) => set('address', e.target.value)} className={INPUT} placeholder="123, Industrial Estate, Phase 1" />
            </Field>
          </div>
          <Field label="City">
            <input value={draft.city} onChange={(e) => set('city', e.target.value)} className={INPUT} placeholder="Chennai" />
          </Field>
          <Field label="State / Province">
            <input value={draft.state} onChange={(e) => set('state', e.target.value)} className={INPUT} placeholder="Tamil Nadu" />
          </Field>
          <Field label="PIN / ZIP Code">
            <input value={draft.pincode} onChange={(e) => set('pincode', e.target.value)} className={INPUT} placeholder="600001" />
          </Field>
        </Section>

        <Section 
          title="Tax & Finance" 
          description="Configure your regional tax identifiers, currency, and accounting periods."
        >
          <Field label="GSTIN">
            <input value={draft.gstin} onChange={(e) => set('gstin', e.target.value.toUpperCase())} className={`${INPUT} font-mono tracking-wider`} placeholder="22AAAAA0000A1Z5" maxLength={15} />
          </Field>
          <Field label="PAN Number">
            <input value={draft.pan} onChange={(e) => set('pan', e.target.value.toUpperCase())} className={`${INPUT} font-mono tracking-wider`} placeholder="AAAAA0000A" maxLength={10} />
          </Field>
          <Field label="Base Currency">
            <select value={draft.currency} onChange={(e) => set('currency', e.target.value)} className={INPUT}>
              <option value="INR">INR — Indian Rupee (₹)</option>
              <option value="USD">USD — US Dollar ($)</option>
              <option value="EUR">EUR — Euro (€)</option>
            </select>
          </Field>
          <Field label="Financial Year Start">
            <select value={draft.financial_year_start} onChange={(e) => set('financial_year_start', e.target.value)} className={INPUT}>
              {FY_OPTIONS.map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </Field>
        </Section>
      </form>
    </section>
  );
}
