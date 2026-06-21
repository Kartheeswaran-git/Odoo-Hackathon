import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useModuleAccess } from '../hooks/useModuleAccess';

const INPUT =
  'w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100';

const EMPTY_MO = {
  number: '', product_name: '', bom_number: '', quantity: 1, unit: 'Units',
  schedule_date: new Date().toISOString().split('T')[0], assignee: '', status: 'Draft',
  components: [], // { product_name, to_consume, consumed, unit }
  work_orders: [] // { operation, work_center, expected_duration, real_duration }
};

export default function ManufacturingOrders() {
  const { canAccess, can } = useModuleAccess();
  const [orders, setOrders] = useState([]);
  const [boms, setBoms] = useState([]);
  const [products, setProducts] = useState([]);
  const [staff, setStaff] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [viewState, setViewState] = useState('list');
  const [current, setCurrent] = useState(EMPTY_MO);
  const [activeTab, setActiveTab] = useState('components');
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [m, b, p, s] = await Promise.all([
        api.module('manufacturing'),
        api.module('bill_of_materials').catch(() => null),
        api.inventory(),
        api.staff().catch(() => null)
      ]);
      setOrders(m || []);
      setBoms(b || []);
      setProducts(p || []);
      setStaff(s?.users || (Array.isArray(s) ? s : []));
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  const handleProductSelect = (name) => {
    const p = products.find(x => x.name === name);
    setCurrent(c => ({ ...c, product_name: name, unit: p?.unit || 'Units', bom_number: '', components: [], work_orders: [] }));
  };

  const handleBomSelect = (bomNum) => {
    const b = boms.find(x => x?.number === bomNum);
    if (!b) return;
    const comps = (b?.components || []).map(c => ({
      product_name: c.product_name,
      to_consume: Number(c.quantity) * Number(current.quantity || 1),
      consumed: 0,
      unit: c.unit || 'Units'
    }));
    const wos = (b?.work_orders || []).map(w => ({
      operation: w.operation,
      work_center: w.work_center,
      expected_duration: w.expected_duration,
      real_duration: ''
    }));
    setCurrent(c => ({ 
      ...c, 
      bom_number: bomNum, 
      product_name: b?.product_name || c.product_name, 
      components: comps, 
      work_orders: wos 
    }));
  };

  const updateQuantity = (qty) => {
    const q = Number(qty) || 1;
    setCurrent(c => {
      const b = boms.find(x => x?.number === c.bom_number);
      let newComps = c.components;
      if (b) {
        newComps = (b?.components || []).map(comp => ({
          product_name: comp.product_name,
          to_consume: Number(comp.quantity) * q,
          consumed: 0,
          unit: comp.unit || 'Units'
        }));
      }
      return { ...c, quantity: q, components: newComps };
    });
  };

  const updateComponent = (index, field, val) => {
    const newComps = [...current.components];
    newComps[index][field] = val;
    setCurrent(c => ({ ...c, components: newComps }));
  };

  const updateWorkOrder = (index, field, val) => {
    const newWos = [...(current.work_orders || [])];
    newWos[index][field] = val;
    setCurrent(c => ({ ...c, work_orders: newWos }));
  };

  const saveOrder = async (statusOverride = null) => {
    setError('');
    try {
      if (!current.bom_number) {
        throw new Error("Manufacturing Order must have a selected Bill of Material.");
      }

      if (statusOverride === 'Produce') {
        const notConsumed = current.components.some(c => Number(c.consumed) < Number(c.to_consume));
        if (notConsumed) {
          throw new Error("Cannot complete MO until all components are fully consumed.");
        }
        const unfinished = (current.work_orders || []).some(w => !w.real_duration);
        if (unfinished) {
          throw new Error("Cannot complete MO unless all work orders are finished (Real Duration required).");
        }
        
        // Save component changes first before hitting produce
        const payload = { ...current };
        let newRecord;
        if (current.id) {
          newRecord = await api.updateModule('manufacturing', current.id, payload);
        } else {
          newRecord = await api.createModule('manufacturing', payload);
        }
        
        // Trigger production stock adjustment using the guaranteed correct ID
        await api.produceMO(newRecord.id);
        await loadData();
        setCurrent(EMPTY_MO);
        setViewState('list');
        return;
      }

      const payload = { ...current };
      if (statusOverride) payload.status = statusOverride;
      if (!payload.number) payload.number = `MO-${Date.now().toString().slice(-4)}`;
      
      let res;
      if (current.id) {
        res = await api.updateModule('manufacturing', current.id, payload);
      } else {
        res = await api.createModule('manufacturing', payload);
      }
      
      await api.createAuditLog({
        action: current.id ? (statusOverride ? `Status changed to ${statusOverride}` : 'Updated') : 'Created',
        entityType: 'Manufacturing Order',
        entityId: res?.id || current.id,
        details: { mo_number: payload.number, product: payload.product_name, status: statusOverride || payload.status }
      }).catch(console.error);

      await loadData();
      setCurrent(EMPTY_MO);
      if (!statusOverride) setViewState('list');
    } catch (e) {
      setError(e.message || 'Error saving manufacturing order');
    }
  };

  const isReadonly = current.status !== 'Draft';
  const availableBoms = current.product_name ? boms.filter(b => b?.product_name === current.product_name) : boms;

  if (!canAccess('manufacturing')) return <div className="p-8 text-center">Access Denied</div>;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Manufacturing Orders</h1>
        </div>
        {viewState === 'list' && can('manufacturing', 'create') && (
          <button onClick={() => { setCurrent(EMPTY_MO); setViewState('form'); }} className="rounded-md bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600">+ New MO</button>
        )}
      </header>

      {error && <div className="p-3 bg-red-50 text-red-700 rounded-md border border-red-200">{error}</div>}

      {viewState === 'list' ? (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900 text-slate-300 uppercase text-xs">
              <tr>
                <th className="px-5 py-3 font-semibold">Reference</th>
                <th className="px-5 py-3 font-semibold">Product</th>
                <th className="px-5 py-3 font-semibold">Quantity</th>
                <th className="px-5 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan="4" className="p-5 text-center text-slate-500">Loading...</td></tr> :
                orders.map((o, index) => (
                  <tr key={o.id ? `${o.id}-${index}` : index} onClick={() => { setCurrent({ id: o.id, ...o }); setActiveTab('components'); setViewState('form'); }} className="hover:bg-slate-50 cursor-pointer">
                    <td className="px-5 py-4 font-mono font-semibold">{o?.number || 'Draft'}</td>
                    <td className="px-5 py-4 font-semibold text-slate-800">{o?.product_name || 'Unknown'}</td>
                    <td className="px-5 py-4">{o?.quantity} {o?.unit}</td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${o?.status==='Draft'?'bg-slate-100':o?.status==='Confirmed'?'bg-blue-100 text-blue-700':o?.status==='In Progress'?'bg-amber-100 text-amber-700':o?.status==='Cancelled'?'bg-red-100 text-red-700':'bg-emerald-100 text-emerald-700'}`}>
                        {o?.status === 'Done' ? 'Produced' : o?.status || 'Draft'}
                      </span>
                    </td>
                  </tr>
                ))
              }
              {(!loading && orders.length === 0) && <tr><td colSpan="4" className="p-8 text-center text-slate-500">No Manufacturing Orders.</td></tr>}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3">
            <div className="flex items-center gap-2">
              <button onClick={() => setViewState('list')} className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Back</button>
              {current.status === 'Draft' && <button onClick={() => saveOrder()} className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">Save</button>}
              {current.status === 'Draft' && <button onClick={() => saveOrder('Confirmed')} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Confirm</button>}
              {current.status === 'Confirmed' && <button onClick={() => saveOrder('In Progress')} className="rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600">Start</button>}
              {current.status === 'In Progress' && <button onClick={() => saveOrder('Produce')} className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600">Produce</button>}
              {['Draft', 'Confirmed', 'In Progress'].includes(current.status) && <button onClick={() => saveOrder('Cancelled')} className="rounded-md bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600">Cancel</button>}
            </div>
            
            <div className="flex items-center gap-3">
              <Link to="/admin/audit-logs?module=manufacturing" className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-orange-300 hover:text-orange-600">Logs</Link>
              <span className={`px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider ${current.status==='Draft'?'bg-slate-200 text-slate-700':current.status==='Confirmed'?'bg-blue-100 text-blue-800':current.status==='In Progress'?'bg-amber-100 text-amber-800':current.status==='Cancelled'?'bg-red-100 text-red-800':'bg-emerald-100 text-emerald-800'}`}>
                Status: {current.status === 'Done' ? 'Produced' : current.status}
              </span>
            </div>
          </div>

          <div className="p-6">
            <div className="mb-6 inline-flex rounded-md border border-dashed border-slate-400 px-3 py-1 font-mono text-lg font-bold tracking-wide text-slate-800">
              {current.number || 'MO-Draft'}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Finished Product</label>
                  <select disabled={isReadonly} value={current.product_name} onChange={e => handleProductSelect(e.target.value)} className={INPUT}>
                    <option value="">Select Product...</option>
                    {products.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                  </select>
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Quantity</label>
                    <input disabled={isReadonly} type="number" min="0.001" step="0.001" value={current.quantity} onChange={e => updateQuantity(e.target.value)} className={INPUT} />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Unit</label>
                    <input type="text" readOnly value={current.unit} className={`${INPUT} bg-slate-50 text-slate-500`} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Bill of Material</label>
                  <select disabled={isReadonly} value={current.bom_number} onChange={e => handleBomSelect(e.target.value)} className={INPUT}>
                    <option value="">Select BoM...</option>
                    {availableBoms.map(b => <option key={b.id} value={b?.number}>{b?.number} - {b?.product_name}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Schedule Date</label>
                  <input disabled={isReadonly} type="date" value={current.schedule_date} onChange={e => setCurrent({...current, schedule_date: e.target.value})} className={INPUT} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Assignee</label>
                  <select disabled={isReadonly} value={current.assignee} onChange={e => setCurrent({...current, assignee: e.target.value})} className={INPUT}>
                    <option value="">Select Person...</option>
                    {staff.map(s => <option key={s.id} value={s.full_name}>{s.full_name}</option>)}
                  </select>
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
                    <thead className="bg-slate-50 text-slate-500 uppercase text-xs tracking-wider">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Component</th>
                        <th className="px-4 py-3 font-semibold">To Consume</th>
                        <th className="px-4 py-3 font-semibold">Availability</th>
                        <th className="px-4 py-3 font-semibold">Consumed</th>
                        <th className="px-4 py-3 font-semibold">Unit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {current.components.map((c, idx) => {
                        const invProd = products.find(p => p.name === c.product_name);
                        const availableQty = invProd?.qty_free_to_use || 0;
                        const isAvailable = availableQty >= Number(c.to_consume);
                        
                        return (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-medium text-slate-800">{c.product_name}</td>
                            <td className="px-4 py-3 text-slate-600">{c.to_consume}</td>
                            <td className="px-4 py-3">
                              {isAvailable ? (
                                <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold"><span className="h-2 w-2 rounded-full bg-emerald-500"></span> Available</span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-red-600 font-semibold"><span className="h-2 w-2 rounded-full bg-red-500"></span> Shortage ({availableQty})</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <input 
                                disabled={current.status === 'Draft' || current.status === 'Done' || current.status === 'Cancelled'} 
                                type="number" 
                                min="0"
                                step="0.001"
                                value={c.consumed} 
                                onChange={e => updateComponent(idx, 'consumed', e.target.value)} 
                                className={`${INPUT} w-32`} 
                              />
                            </td>
                            <td className="px-4 py-3 text-slate-500">{c.unit}</td>
                          </tr>
                        );
                      })}
                      {current.components.length === 0 && (
                        <tr><td colSpan="5" className="px-4 py-6 text-center text-slate-500">Select a BOM to populate components.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[46rem] text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 uppercase text-xs tracking-wider">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Operation</th>
                        <th className="px-4 py-3 font-semibold">Work Center</th>
                        <th className="px-4 py-3 font-semibold">Expected Duration</th>
                        <th className="px-4 py-3 font-semibold">Real Duration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(current.work_orders || []).map((w, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-slate-800">{w.operation || '—'}</td>
                          <td className="px-4 py-3 text-slate-600">{w.work_center || '—'}</td>
                          <td className="px-4 py-3 text-slate-600">{w.expected_duration || '—'}</td>
                          <td className="px-4 py-3">
                            <input 
                              disabled={current.status === 'Draft' || current.status === 'Done' || current.status === 'Cancelled'} 
                              type="text" 
                              value={w.real_duration || ''} 
                              onChange={e => updateWorkOrder(idx, 'real_duration', e.target.value)} 
                              placeholder="e.g. 1h 30m"
                              className={INPUT} 
                            />
                          </td>
                        </tr>
                      ))}
                      {!(current.work_orders && current.work_orders.length > 0) && (
                        <tr><td colSpan="4" className="px-4 py-6 text-center text-slate-500">Select a BOM with Work Orders to populate.</td></tr>
                      )}
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
