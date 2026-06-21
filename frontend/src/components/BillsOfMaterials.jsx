import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useModuleAccess } from '../hooks/useModuleAccess';

const EMPTY_BOM = {
  number: '',
  product_name: '',
  quantity: 1,
  unit: 'Units',
  reference: '',
  components: [],
  work_orders: [],
};

const INPUT =
  'w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100';

function useDebouncedValue(value, delay = 350) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedValue(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

function normalizeBom(row = {}) {
  const source = row.data || row;
  return {
    ...EMPTY_BOM,
    ...source,
    id: row.id || source.id,
    components: Array.isArray(source.components) ? source.components : [],
    work_orders: Array.isArray(source.work_orders) ? source.work_orders : [],
  };
}

function nextBomNumber(boms) {
  const maxNumber = boms.reduce((max, bom) => {
    const match = String(normalizeBom(bom).number || '').match(/BOM-(\d+)/i);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);

  return `BOM-${String(maxNumber + 1).padStart(6, '0')}`;
}

function ProductLookup({ value, onChange, placeholder = 'Search product…', className = INPUT }) {
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const debouncedValue = useDebouncedValue(value);
  const ref = useRef(null);

  useEffect(() => {
    function close(event) {
      if (!ref.current?.contains(event.target)) setOpen(false);
    }

    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  useEffect(() => {
    let mounted = true;
    const query = debouncedValue.trim();

    if (query.length < 2) {
      setSuggestions([]);
      return () => {
        mounted = false;
      };
    }

    api.suggestions('items', query)
      .then((rows) => {
        if (mounted) setSuggestions(rows ?? []);
      })
      .catch(() => {
        if (mounted) setSuggestions([]);
      });

    return () => {
      mounted = false;
    };
  }, [debouncedValue]);

  return (
    <div ref={ref} className="relative">
      <input
        value={value}
        onChange={(event) => {
          onChange(event.target.value, null);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        data-lpignore="true"
        data-form-type="other"
        className={className}
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-52 w-full overflow-auto rounded-md border border-slate-200 bg-white shadow-lg">
          {suggestions.map((product) => (
            <li
              key={product.id}
              onMouseDown={() => {
                onChange(product.name, product);
                setOpen(false);
              }}
              className="cursor-pointer px-3 py-2 text-sm hover:bg-orange-50"
            >
              <div className="font-semibold text-slate-800">{product.name}</div>
              <div className="text-xs text-slate-500">
                {product.sku || 'No SKU'} · Free stock {product.qty_free_to_use ?? 0}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function BillsOfMaterials() {
  const { canAccess, can } = useModuleAccess();
  const [boms, setBoms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewState, setViewState] = useState('list');
  const [current, setCurrent] = useState(EMPTY_BOM);
  const [activeTab, setActiveTab] = useState('components');
  const [error, setError] = useState('');

  useEffect(() => {
    void loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const rows = await api.module('bill_of_materials');
      setBoms(rows || []);
    } catch (e) {
      setError(e.message || 'Could not load Bill of Materials.');
    } finally {
      setLoading(false);
    }
  }

  function newBom() {
    setCurrent({ ...EMPTY_BOM, number: nextBomNumber(boms) });
    setActiveTab('components');
    setViewState('form');
    setError('');
  }

  function openBom(row) {
    setCurrent(normalizeBom(row));
    setActiveTab('components');
    setViewState('form');
    setError('');
  }

  function setBomField(field, value) {
    setCurrent((draft) => ({ ...draft, [field]: value }));
  }

  function updateComponent(index, patch) {
    setCurrent((draft) => ({
      ...draft,
      components: draft.components.map((component, componentIndex) =>
        componentIndex === index ? { ...component, ...patch } : component
      ),
    }));
  }

  function updateWorkOrder(index, patch) {
    setCurrent((draft) => ({
      ...draft,
      work_orders: draft.work_orders.map((workOrder, workOrderIndex) =>
        workOrderIndex === index ? { ...workOrder, ...patch } : workOrder
      ),
    }));
  }

  async function saveBom() {
    if (!current.product_name.trim()) {
      setError('Finished product is required.');
      return;
    }

    if (!Number(current.quantity) || Number(current.quantity) <= 0) {
      setError('Quantity must be greater than zero.');
      return;
    }

    if (!current.components || current.components.length === 0) {
      setError('BOM must have at least one component.');
      return;
    }

    if (!current.work_orders || current.work_orders.length === 0) {
      setError('BOM must contain at least one operation.');
      return;
    }

    try {
      const payload = {
        ...current,
        number: current.number || nextBomNumber(boms),
        reference: String(current.reference || '').slice(0, 8),
      };

      delete payload.id;

      if (current.id) {
        await api.deleteModule('bill_of_materials', current.id).catch(() => null);
      }

      const res = await api.createModule('bill_of_materials', payload);
      
      await api.createAuditLog({
        action: current.id ? 'Updated' : 'Created',
        entityType: 'Bill of Materials',
        entityId: res?.id || current.id,
        details: { bom_number: payload.number, product: payload.product_name }
      }).catch(console.error);

      await loadData();
      setCurrent(EMPTY_BOM);
      setViewState('list');
    } catch (e) {
      setError(e.message || 'Could not save Bill of Materials.');
    }
  }

  if (!canAccess('bill_of_materials')) {
    return <div className="p-8 text-center text-slate-500">Access Denied</div>;
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Bill of Materials</h1>
          <p className="text-sm text-slate-500">Create reusable production templates for manufacturing orders.</p>
        </div>
        {viewState === 'list' && can('bill_of_materials', 'create') && (
          <button
            onClick={newBom}
            className="rounded-md bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600"
          >
            + New
          </button>
        )}
      </header>

      {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {viewState === 'list' ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900 text-xs uppercase tracking-wider text-slate-300">
              <tr>
                <th className="px-5 py-3 font-semibold">BoM Number</th>
                <th className="px-5 py-3 font-semibold">Finished Product</th>
                <th className="px-5 py-3 font-semibold">Quantity</th>
                <th className="px-5 py-3 font-semibold">Unit</th>
                <th className="px-5 py-3 font-semibold">Components</th>
                <th className="px-5 py-3 font-semibold">Work Orders</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-500">Loading BoM templates…</td></tr>
              ) : boms.length ? (
                boms.map((row) => {
                  const bom = normalizeBom(row);
                  return (
                    <tr key={bom.id || bom.number} onClick={() => openBom(row)} className="cursor-pointer hover:bg-slate-50">
                      <td className="px-5 py-4 font-mono font-semibold text-slate-800">{bom.number || 'Draft'}</td>
                      <td className="px-5 py-4 font-semibold text-slate-800">{bom.product_name || bom.product || 'Unknown'}</td>
                      <td className="px-5 py-4 text-slate-600">{bom.quantity}</td>
                      <td className="px-5 py-4 text-slate-600">{bom.unit}</td>
                      <td className="px-5 py-4 text-slate-600">{bom.components.length}</td>
                      <td className="px-5 py-4 text-slate-600">{bom.work_orders.length}</td>
                    </tr>
                  );
                })
              ) : (
                <tr><td colSpan={6} className="p-8 text-center text-slate-500">No BoM templates yet. Click New to create one.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3">
            <div className="flex items-center gap-2">
              <button onClick={() => setViewState('list')} className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Back
              </button>
              <button onClick={saveBom} className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
                Save
              </button>
            </div>
            <Link
              to="/admin/audit-logs?module=bill_of_materials"
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-orange-300 hover:text-orange-600"
            >
              Logs
            </Link>
          </div>

          <div className="p-6">
            <div className="mb-6 inline-flex rounded-md border border-dashed border-slate-400 px-3 py-1 font-mono text-lg font-bold tracking-wide text-slate-800">
              {current.number || 'BOM-000001'}
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_24rem]">
              <div className="space-y-4">
                <div className="grid gap-2 sm:grid-cols-[10rem_1fr] sm:items-center">
                  <label className="text-sm font-semibold text-slate-700">Finished Product</label>
                  <ProductLookup
                    value={current.product_name}
                    onChange={(name) => setBomField('product_name', name)}
                    placeholder="Search finished product from items…"
                  />
                </div>
                <div className="grid gap-2 sm:grid-cols-[10rem_1fr_6rem] sm:items-center">
                  <label className="text-sm font-semibold text-slate-700">Quantity</label>
                  <input
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={current.quantity}
                    onChange={(event) => setBomField('quantity', event.target.value)}
                    className={INPUT}
                  />
                  <select value={current.unit} onChange={(event) => setBomField('unit', event.target.value)} className={INPUT}>
                    <option value="Units">Units</option>
                    <option value="Kg">Kg</option>
                    <option value="Liters">Liters</option>
                    <option value="Meters">Meters</option>
                  </select>
                </div>
                <div className="grid gap-2 sm:grid-cols-[10rem_1fr] sm:items-center">
                  <label className="text-sm font-semibold text-slate-700">Reference</label>
                  <input
                    value={current.reference}
                    onChange={(event) => setBomField('reference', event.target.value.slice(0, 8))}
                    maxLength={8}
                    placeholder="Max 8 characters"
                    className={INPUT}
                  />
                </div>
              </div>
            </div>

            <div className="mt-8 overflow-hidden rounded-lg border border-slate-200">
              <div className="grid grid-cols-2 bg-slate-900 text-sm font-semibold text-white">
                <button
                  onClick={() => setActiveTab('components')}
                  className={`px-4 py-3 transition ${activeTab === 'components' ? 'bg-orange-500' : 'hover:bg-slate-800'}`}
                >
                  Components
                </button>
                <button
                  onClick={() => setActiveTab('work_orders')}
                  className={`px-4 py-3 transition ${activeTab === 'work_orders' ? 'bg-orange-500' : 'hover:bg-slate-800'}`}
                >
                  Work Orders
                </button>
              </div>

              {activeTab === 'components' ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[46rem] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Components</th>
                        <th className="px-4 py-3 font-semibold">To Consume</th>
                        <th className="px-4 py-3 font-semibold">Unit</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {current.components.map((component, index) => (
                        <tr key={index}>
                          <td className="px-4 py-3">
                            <ProductLookup
                              value={component.product_name || ''}
                              onChange={(name) => updateComponent(index, { product_name: name })}
                              placeholder="Add a product"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min="0.001"
                              step="0.001"
                              value={component.quantity}
                              onChange={(event) => updateComponent(index, { quantity: event.target.value })}
                              className={INPUT}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <select value={component.unit || 'Units'} onChange={(event) => updateComponent(index, { unit: event.target.value })} className={INPUT}>
                              <option value="Units">Units</option>
                              <option value="Kg">Kg</option>
                              <option value="Liters">Liters</option>
                              <option value="Meters">Meters</option>
                            </select>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => setCurrent((draft) => ({ ...draft, components: draft.components.filter((_, i) => i !== index) }))}
                              className="rounded-md px-2 py-1 text-sm font-semibold text-red-500 hover:bg-red-50"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                      <tr>
                        <td colSpan={4} className="px-4 py-3">
                          <button
                            onClick={() => setCurrent((draft) => ({ ...draft, components: [...draft.components, { product_name: '', quantity: 1, unit: 'Units' }] }))}
                            className="text-sm font-semibold text-orange-600 hover:text-orange-700"
                          >
                            Add a product
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[46rem] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Operations</th>
                        <th className="px-4 py-3 font-semibold">Work Center</th>
                        <th className="px-4 py-3 font-semibold">Expected Duration</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {current.work_orders.map((workOrder, index) => (
                        <tr key={index}>
                          <td className="px-4 py-3"><input value={workOrder.operation || ''} onChange={(event) => updateWorkOrder(index, { operation: event.target.value })} placeholder="Cutting / Polishing / Assembly" className={INPUT} /></td>
                          <td className="px-4 py-3"><input value={workOrder.work_center || ''} onChange={(event) => updateWorkOrder(index, { work_center: event.target.value })} placeholder="Workshop / CNC / Paint booth" className={INPUT} /></td>
                          <td className="px-4 py-3"><input value={workOrder.expected_duration || ''} onChange={(event) => updateWorkOrder(index, { expected_duration: event.target.value })} placeholder="e.g. 2 hours" className={INPUT} /></td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => setCurrent((draft) => ({ ...draft, work_orders: draft.work_orders.filter((_, i) => i !== index) }))}
                              className="rounded-md px-2 py-1 text-sm font-semibold text-red-500 hover:bg-red-50"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                      <tr>
                        <td colSpan={4} className="px-4 py-3">
                          <button
                            onClick={() => setCurrent((draft) => ({ ...draft, work_orders: [...draft.work_orders, { operation: '', work_center: '', expected_duration: '' }] }))}
                            className="text-sm font-semibold text-orange-600 hover:text-orange-700"
                          >
                            Add a line
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
