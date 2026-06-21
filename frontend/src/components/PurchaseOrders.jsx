import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useModuleAccess } from '../hooks/useModuleAccess';
import { PrintFooter, PrintHeader } from './PrintDocumentDetails';

const EMPTY_PO = {
  number: '', vendor_id: '', vendor_name: '', vendor_address: '', creation_date: new Date().toISOString().split('T')[0],
  responsible_id: '', responsible_name: '', status: 'Draft',
  lines: [] // { product_id, product_name, cost_price, ordered_qty, received_qty, uom, total }
};

export default function PurchaseOrders() {
  const { canAccess, can } = useModuleAccess();
  const [orders, setOrders] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [products, setProducts] = useState([]);
  const [staff, setStaff] = useState([]);
  const [company, setCompany] = useState({ company_name: 'Shiv Furniture Works', currency: 'INR' });
  
  const [loading, setLoading] = useState(true);
  const [viewState, setViewState] = useState('list'); // list, form
  const [current, setCurrent] = useState(EMPTY_PO);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [o, p, i, s, companyProfile] = await Promise.all([
        api.module('purchases'),
        api.module('parties'),
        api.inventory(),
        api.staff().catch(() => null),
        api.companyProfile()
      ]);
      setOrders(o || []);
      setVendors((p || []).filter(v => v.party_type !== 'Customer'));
      setProducts(i || []);
      setStaff(s?.users || (Array.isArray(s) ? s : []));
      setCompany(companyProfile || company);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  const handleVendorSelect = (name) => {
    const v = vendors.find(x => x.name === name);
    setCurrent(c => ({ ...c, vendor_name: name, vendor_address: v?.address || '' }));
  };

  const handleProductSelect = (index, prodName) => {
    const p = products.find(x => x.name === prodName);
    const newLines = [...current.lines];
    newLines[index] = {
      ...newLines[index],
      product_name: prodName,
      cost_price: p?.cost_price || 0,
      uom: p?.unit || 'Units',
      ordered_qty: 1,
      received_qty: 0,
      total: (p?.cost_price || 0) * 1
    };
    setCurrent(c => ({ ...c, lines: newLines }));
  };

  const updateLine = (index, field, val) => {
    const newLines = [...current.lines];
    newLines[index][field] = val;
    if (field === 'ordered_qty' || field === 'cost_price') {
      newLines[index].total = Number(newLines[index].ordered_qty) * Number(newLines[index].cost_price);
    }
    setCurrent(c => ({ ...c, lines: newLines }));
  };

  const saveOrder = async (statusOverride = null) => {
    try {
      const payload = { ...current };
      if (statusOverride) payload.status = statusOverride;
      if (!payload.number) payload.number = `PO-${Date.now().toString().slice(-4)}`;
      
      let res;
      if (current.id) {
        res = await api.updateModule('purchases', current.id, payload);
      } else {
        res = await api.createModule('purchases', payload);
      }
      
      // Update local state
      await loadData();
      setCurrent(res ? { id: res.id, ...res } : EMPTY_PO);
      if (!statusOverride) setViewState('list'); // Go back if just saving draft
    } catch (e) {
      setError(e.message);
    }
  };

  const grandTotal = current.lines.reduce((acc, l) => acc + Number(l.total), 0);
  const isReadonly = current.status !== 'Draft';

  if (!canAccess('purchases')) return <div className="p-8 text-center">Access Denied</div>;

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Purchase Orders</h1>
        </div>
        {viewState === 'list' && can('purchases', 'create') && (
          <button onClick={() => { setCurrent(EMPTY_PO); setViewState('form'); }} className="bg-orange-500 text-white px-4 py-2 rounded-md font-semibold hover:bg-orange-600 shadow-sm">+ New PO</button>
        )}
      </header>

      {error && <div className="p-3 bg-red-50 text-red-700 rounded-md">{error}</div>}

      {viewState === 'list' ? (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900 text-slate-300 uppercase text-xs">
              <tr>
                <th className="px-5 py-3 font-semibold">Reference</th>
                <th className="px-5 py-3 font-semibold">Date</th>
                <th className="px-5 py-3 font-semibold">Vendor</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan="5" className="p-5 text-center">Loading...</td></tr> :
                orders.map((o, index) => (
                  <tr key={o.id ? `${o.id}-${index}` : index} onClick={() => { setCurrent({ id: o.id, ...o }); setViewState('form'); }} className="hover:bg-slate-50 cursor-pointer">
                    <td className="px-5 py-4 font-mono font-semibold">{o?.number || 'Draft'}</td>
                    <td className="px-5 py-4">{o?.creation_date}</td>
                    <td className="px-5 py-4">{o?.vendor_name}</td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${o?.status==='Draft'?'bg-slate-100':o?.status==='Confirmed'?'bg-blue-100 text-blue-700':o?.status==='Cancelled'?'bg-red-100 text-red-700':'bg-emerald-100 text-emerald-700'}`}>
                        {o?.status || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-bold">₹{o?.lines?.reduce((acc, l) => acc + Number(l.total), 0) || o?.total || 0}</td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      ) : (
        <div className="print-document bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
          <PrintHeader company={company} title="PURCHASE ORDER" number={current.number || 'Draft'} date={current.creation_date} partyLabel="Vendor" partyName={current.vendor_name} partyAddress={current.vendor_address} />
          <div className="no-print flex flex-wrap gap-3 mb-6 border-b border-slate-100 pb-4">
            <button onClick={() => setViewState('list')} className="px-4 py-2 text-sm font-semibold text-slate-600 border rounded-md hover:bg-slate-50">Back</button>
            <button type="button" onClick={() => window.print()} className="px-4 py-2 text-sm font-semibold text-slate-700 border border-slate-300 rounded-md hover:bg-slate-50">Print Purchase</button>
            {current.status === 'Draft' && <button onClick={() => saveOrder()} className="px-4 py-2 text-sm font-semibold text-white bg-slate-800 rounded-md hover:bg-slate-900">Save Draft</button>}
            {current.status === 'Draft' && <button onClick={() => saveOrder('Confirmed')} className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700">Confirm</button>}
            {['Confirmed', 'Partially Received'].includes(current.status) && <button onClick={() => {
               const allReceived = current.lines.every(l => Number(l.received_qty) >= Number(l.ordered_qty));
               saveOrder(allReceived ? 'Fully Received' : 'Partially Received');
            }} className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-700">Receive</button>}
            {['Draft', 'Confirmed'].includes(current.status) && <button onClick={() => saveOrder('Cancelled')} className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-md hover:bg-red-700">Cancel</button>}
            
            <div className="ml-auto flex items-center">
              <span className={`px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider ${current.status==='Draft'?'bg-slate-100':current.status==='Confirmed'?'bg-blue-100 text-blue-800':current.status==='Cancelled'?'bg-red-100 text-red-800':'bg-emerald-100 text-emerald-800'}`}>
                Status: {current.status}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Vendor</label>
                <select disabled={isReadonly} value={current.vendor_name} onChange={e => handleVendorSelect(e.target.value)} className="w-full p-2 border rounded-md outline-none">
                  <option value="">Select Vendor...</option>
                  {vendors.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Vendor Address</label>
                <textarea disabled={isReadonly} value={current.vendor_address} onChange={e => setCurrent({...current, vendor_address: e.target.value})} className="w-full p-2 border rounded-md outline-none" rows="3"></textarea>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Creation Date</label>
                <input disabled={isReadonly} type="date" value={current.creation_date} onChange={e => setCurrent({...current, creation_date: e.target.value})} className="w-full p-2 border rounded-md outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Responsible Person</label>
                <select disabled={isReadonly} value={current.responsible_name} onChange={e => setCurrent({...current, responsible_name: e.target.value})} className="w-full p-2 border rounded-md outline-none">
                  <option value="">Select Person...</option>
                  {staff.map(s => <option key={s.id} value={s.full_name}>{s.full_name}</option>)}
                </select>
              </div>
            </div>
          </div>

          <h3 className="text-sm font-bold text-slate-800 border-b pb-2 mb-4">Products</h3>
          <table className="w-full text-left text-sm mb-4">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="p-2">Product</th>
                <th className="p-2">Ordered Qty</th>
                <th className="p-2">Received Qty</th>
                <th className="p-2">UOM</th>
                <th className="p-2">Cost Price</th>
                <th className="p-2">Total</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {current.lines.map((l, idx) => (
                <tr key={idx} className="border-b">
                  <td className="p-2">
                    <select disabled={isReadonly} value={l.product_name} onChange={e => handleProductSelect(idx, e.target.value)} className="w-full p-1 border rounded outline-none">
                      <option value="">Select...</option>
                      {products.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                    </select>
                  </td>
                  <td className="p-2"><input disabled={isReadonly} type="number" value={l.ordered_qty} onChange={e => updateLine(idx, 'ordered_qty', e.target.value)} className="w-20 p-1 border rounded" /></td>
                  <td className="p-2"><input disabled={current.status === 'Draft' || current.status === 'Cancelled' || current.status === 'Fully Received'} type="number" value={l.received_qty} onChange={e => updateLine(idx, 'received_qty', e.target.value)} className="w-20 p-1 border rounded" /></td>
                  <td className="p-2">{l.uom}</td>
                  <td className="p-2">₹{l.cost_price}</td>
                  <td className="p-2 font-semibold">₹{l.total}</td>
                  <td className="p-2">
                    {!isReadonly && <button onClick={() => setCurrent(c => ({...c, lines: c.lines.filter((_, i) => i !== idx)}))} className="text-red-500">✕</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!isReadonly && <button onClick={() => setCurrent(c => ({...c, lines: [...c.lines, {product_name:'', ordered_qty:1, received_qty:0, cost_price:0, total:0, uom:'Units'}]}))} className="text-sm font-semibold text-orange-500 hover:text-orange-600">+ Add a product</button>}

          <div className="flex justify-end mt-6">
            <p className="text-xl font-bold text-slate-800">Total: ₹{grandTotal}</p>
          </div>
          <PrintFooter company={company} />
        </div>
      )}
    </div>
  );
}
