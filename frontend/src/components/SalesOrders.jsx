import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { useModuleAccess } from '../hooks/useModuleAccess';
import { PrintFooter, PrintHeader } from './PrintDocumentDetails';

const formatQty = (v) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 3 }).format(Number(v));
const formatCurrency = (v) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(v));
const today = () => new Date().toISOString().slice(0, 10);

function useDebouncedValue(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedValue(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

/** Autocomplete input — shows dropdown suggestions while typing */
function AutocompleteInput({ id, value, onChange, suggestions, placeholder, className }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) { if (!ref.current?.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = suggestions.filter((s) => s.toLowerCase().includes(value.toLowerCase()) && s !== value);

  return (
    <div ref={ref} className="relative">
      <input
        id={id}
        type="text"
        value={value}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        data-lpignore="true"
        data-form-type="other"
        placeholder={placeholder}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        className={className}
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-md border border-slate-200 bg-white shadow-lg">
          {filtered.map((s) => (
            <li
              key={s}
              onMouseDown={() => { onChange(s); setOpen(false); }}
              className="cursor-pointer px-3 py-2 text-sm text-slate-700 hover:bg-orange-50 hover:text-orange-700"
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const INPUT_CLS = 'mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-slate-800 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 text-sm';

export default function SalesOrders({ startCreating = false }) {
  const { can } = useModuleAccess();

  // Data
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [parties, setParties] = useState([]);
  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [productSuggestions, setProductSuggestions] = useState([]);
  const [productSuggestionRows, setProductSuggestionRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState({ company_name: 'Shiv Furniture Works', currency: 'INR' });

  const [searchTerm, setSearchTerm] = useState('');
  const [viewOrder, setViewOrder] = useState(null);

  // Form state
  const [isCreating, setIsCreating] = useState(startCreating && can('sales', 'create'));
  const [billDate, setBillDate] = useState(today());
  const [billNo, setBillNo] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState([]);

  // Line input state
  const [lineProduct, setLineProduct] = useState('');
  const [lineQty, setLineQty] = useState('1');
  const [linePrice, setLinePrice] = useState('');

  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  const debouncedCustomerName = useDebouncedValue(customerName, 350);
  const debouncedLineProduct = useDebouncedValue(lineProduct, 350);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [sales, inv, pts, companyProfile] = await Promise.all([
        api.salesOrders(),
        api.inventory(),
        api.module('parties'),
        api.companyProfile(),
      ]);
      setOrders(sales ?? []);
      setProducts(inv ?? []);
      setParties(pts ?? []);
      setCompany(companyProfile ?? company);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load data.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  // When user picks a product name, auto-fill price
  useEffect(() => {
    const found = products.find((p) => p.name === lineProduct);
    if (found) setLinePrice(String(found.sales_price ?? ''));
  }, [lineProduct, products]);

  function resetForm() {
    setBillDate(today());
    setBillNo('');
    setCustomerName('');
    setNotes('');
    setLines([]);
    setLineProduct('');
    setLineQty('1');
    setLinePrice('');
    setError('');
    setIsCreating(false);
  }

  function addLine() {
    if (!lineProduct.trim()) { setError('Enter a product name.'); return; }
    const product = products.find((p) => p.name === lineProduct);
    if (!product) { setError('Please select an existing product from the dropdown.'); return; }
    
    const qty = Number(lineQty);
    const price = Number(linePrice);
    if (!Number.isFinite(qty) || qty <= 0) { setError('Enter a valid quantity.'); return; }
    setLines((cur) => {
      const existing = cur.find((l) => l.name === lineProduct);
      if (existing) return cur.map((l) => l.name === lineProduct ? { ...l, quantity: l.quantity + qty } : l);
      return [...cur, { product_id: product.id, name: product.name, sku: product.sku, quantity: qty, unit_price: price }];
    });
    setLineProduct('');
    setLineQty('1');
    setLinePrice('');
    setError('');
  }

  async function saveDraft() {
    if (!customerName.trim()) { setError('Enter a customer name.'); return; }
    if (!lines.length) { setError('Add at least one product line.'); return; }
    setSaving(true);
    setError('');
    try {
      await api.createSalesOrder(customerName.trim(), lines);
      setNotice('Draft sales order saved. An Admin can confirm it to reserve stock and trigger procurement.');
      resetForm();
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const grandTotal = lines.reduce((sum, l) => sum + l.quantity * l.unit_price, 0);

  return (
    <section aria-labelledby="sales-orders-title">
      {/* Page header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 id="sales-orders-title" className="text-2xl font-bold tracking-tight text-slate-800">Sales Orders</h1>
        </div>
        {can('sales', 'create') && (
          <button
            type="button"
            onClick={() => { setIsCreating(true); setNotice(''); }}
            className="rounded-md bg-safety px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-safety-dark focus:outline-none focus:ring-2 focus:ring-safety focus:ring-offset-2"
          >
            + New Sales Order
          </button>
        )}
      </div>

      {/* Notices */}
      {notice && <div role="status" className="mb-5 rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800">{notice}</div>}
      {error && <div role="alert" className="mb-5 rounded-md border border-orange-200 bg-orange-50 p-4 text-sm text-orange-800">{error}</div>}

      {/* ── New Order Form ─────────────────────────────────────────────────── */}
      {isCreating && (
        <section className="print-document mb-8 rounded-xl border border-slate-200 bg-white shadow-sm" aria-labelledby="new-order-title">
          <PrintHeader company={company} title="TAX INVOICE / SALES BILL" number={billNo || 'Draft'} date={billDate} partyLabel="Bill To" partyName={customerName} />
          {/* Form header */}
          <div className="no-print flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h2 id="new-order-title" className="text-lg font-bold text-slate-800">New Draft Sales Order</h2>
            <button type="button" onClick={resetForm} className="text-sm font-semibold text-slate-500 hover:text-slate-800">✕ Cancel</button>
          </div>

          <div className="p-6 space-y-6">
            {/* ── Bill details grid ── */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Bill No */}
              <div>
                <label htmlFor="bill-no" className="block text-sm font-semibold text-slate-700">Bill / Order No.</label>
                <input
                  id="bill-no"
                  value={billNo}
                  onChange={(e) => setBillNo(e.target.value)}
                  placeholder="e.g. SO-2026-001"
                  className={INPUT_CLS}
                />
              </div>

              {/* Date */}
              <div>
                <label htmlFor="bill-date" className="block text-sm font-semibold text-slate-700">Date</label>
                <input
                  id="bill-date"
                  type="date"
                  value={billDate}
                  onChange={(e) => setBillDate(e.target.value)}
                  className={INPUT_CLS}
                />
              </div>

              {/* Customer — autocomplete from parties */}
              <div className="sm:col-span-2">
                <label htmlFor="customer-name" className="block text-sm font-semibold text-slate-700">
                  Customer Name <span className="text-orange-500">*</span>
                </label>
                <select
                  id="customer-name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className={INPUT_CLS}
                >
                  <option value="">Select Customer...</option>
                  {parties.filter(p => p.party_type !== 'Supplier').map(p => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div className="sm:col-span-2 lg:col-span-4">
                <label htmlFor="order-notes" className="block text-sm font-semibold text-slate-700">Notes / Remarks</label>
                <input
                  id="order-notes"
                  value={notes}
                  name="order-notes-disabled-autofill"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  data-lpignore="true"
                  data-form-type="other"
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Delivery instructions, special requests…"
                  className={INPUT_CLS}
                />
              </div>
            </div>

            {/* ── Product line input ── */}
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-700">Add Product Line</p>
              <div className="grid gap-3 sm:grid-cols-[1fr_8rem_10rem_auto]">
                {/* Product autocomplete */}
                <div>
                  <label className="sr-only" htmlFor="line-product">Product</label>
                  <select
                    id="line-product"
                    value={lineProduct}
                    onChange={(e) => setLineProduct(e.target.value)}
                    className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                  >
                    <option value="">Select Product...</option>
                    {products.map(p => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>

                {/* Quantity */}
                <div>
                  <label className="sr-only" htmlFor="line-qty">Qty</label>
                  <input
                    id="line-qty"
                    type="number" min="0.001" step="0.001"
                    value={lineQty}
                    onChange={(e) => setLineQty(e.target.value)}
                    placeholder="Qty"
                    className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                  />
                </div>

                {/* Unit Price */}
                <div>
                  <label className="sr-only" htmlFor="line-price">Unit Price (₹)</label>
                  <input
                    id="line-price"
                    type="number" min="0" step="0.01"
                    value={linePrice}
                    onChange={(e) => setLinePrice(e.target.value)}
                    placeholder="Unit Price (₹)"
                    className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                  />
                </div>

                <button
                  type="button"
                  onClick={addLine}
                  className="self-stretch rounded-md bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600"
                >
                  + Add
                </button>
              </div>
            </div>

            {/* ── Lines table ── */}
            {lines.length > 0 && (
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-2 font-semibold">S.No</th>
                      <th className="px-4 py-2 font-semibold">Product</th>
                      <th className="px-4 py-2 font-semibold">SKU</th>
                      <th className="px-4 py-2 text-right font-semibold">Qty</th>
                      <th className="px-4 py-2 text-right font-semibold">Unit Price</th>
                      <th className="px-4 py-2 text-right font-semibold">Amount</th>
                      <th className="px-4 py-2 text-right font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {lines.map((line, idx) => (
                      <tr key={line.product_id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-500">{idx + 1}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">{line.name}</td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-400">{line.sku}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-700">{formatQty(line.quantity)}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-700">{formatCurrency(line.unit_price)}</td>
                        <td className="px-4 py-3 text-right tabular-nums font-semibold text-slate-800">{formatCurrency(line.quantity * line.unit_price)}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => setLines((cur) => cur.filter((l) => l.product_id !== line.product_id))}
                            className="text-sm font-semibold text-red-500 hover:text-red-700"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 border-slate-200 bg-slate-50">
                    <tr>
                      <td colSpan={5} className="px-4 py-3 text-right text-sm font-bold text-slate-700">Grand Total</td>
                      <td className="px-4 py-3 text-right text-base font-bold text-orange-600">{formatCurrency(grandTotal)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
            <PrintFooter company={company} />

            {/* ── Actions ── */}
            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
              <button type="button" onClick={() => window.print()} className="no-print rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Print Bill
              </button>
              <button type="button" onClick={resetForm} className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void saveDraft()}
                className="rounded-md bg-safety px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-safety-dark disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save Draft'}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ── Order Detail View ──────────────────────────────────────────────── */}
      {viewOrder && !isCreating && (
        <section className="print-document mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <PrintHeader company={company} title="SALES ORDER" number={viewOrder.order_number ? `SO-${viewOrder.order_number}` : 'Draft'} date={viewOrder.created_at ? new Date(viewOrder.created_at).toLocaleDateString('en-IN') : ''} partyLabel="Customer" partyName={viewOrder.customer_name} />
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 mb-4">
            <div>
              <button type="button" onClick={() => setViewOrder(null)} className="text-sm font-semibold text-orange-500 hover:text-orange-600 mb-1">
                ← Go back
              </button>
              <h2 className="text-xl font-bold text-slate-800">
                {viewOrder.order_number ? `SO-${viewOrder.order_number}` : 'Draft Order'}
              </h2>
              <p className="text-sm text-slate-500 mt-1">Customer: {viewOrder.customer_name} • Status: <span className="font-semibold text-slate-700">{viewOrder.status}</span></p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => window.print()} className="no-print rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Print Bill</button>
              {viewOrder.status === 'Draft' && can('sales', 'approve') && (
                <button type="button" onClick={async () => {
                  try { await api.confirmSalesOrder(viewOrder.id); alert('Order confirmed!'); load(); setViewOrder(null); } catch(e) { alert(e.message); }
                }} className="rounded-md bg-orange-100 px-4 py-2 text-sm font-semibold text-orange-700 hover:bg-orange-200">
                  Confirm
                </button>
              )}
              {viewOrder.status === 'Confirmed' && can('sales', 'edit') && (
                <button type="button" onClick={async () => {
                  const qty = prompt(`Enter delivered quantity (Ordered lines: ${viewOrder.line_count}):`, viewOrder.line_count);
                  if (qty) {
                    try { await api.deliverSalesOrder(viewOrder.id, { deliveredQty: Number(qty), orderedQty: viewOrder.line_count || 1 }); alert('Delivery updated!'); load(); setViewOrder(null); } catch(e) { alert(e.message); }
                  }
                }} className="rounded-md bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-200">
                  Deliver
                </button>
              )}
              {viewOrder.status !== 'Cancelled' && can('sales', 'edit') && (
                <button type="button" onClick={async () => {
                  if (confirm('Cancel this order?')) {
                    try { await api.cancelSalesOrder(viewOrder.id); alert('Order cancelled!'); load(); setViewOrder(null); } catch(e) { alert(e.message); }
                  }
                }} className="rounded-md bg-red-100 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-200">
                  Cancel
                </button>
              )}
              <a href="/admin/audit-logs?module=sales" className="no-print rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Logs
              </a>
            </div>
          </div>
          <div className="text-sm text-slate-600">
            <p><strong>Created:</strong> {viewOrder.created_at ? new Date(viewOrder.created_at).toLocaleString() : 'N/A'}</p>
            <p className="mt-2">This is the details view. Line items details are tracked via the backend.</p>
          </div>
          <PrintFooter company={company} />
        </section>
      )}

      {/* ── Orders Table ───────────────────────────────────────────────────── */}
      {!viewOrder && !isCreating && (
        <>
          <div className="mb-4 flex items-center justify-between">
            <div className="relative w-full max-w-sm">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></span>
              <input
                type="text"
                placeholder="Search by reference or customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-full border border-slate-300 py-2 pl-10 pr-4 text-sm text-slate-800 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              />
            </div>
          </div>
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[48rem] text-left text-sm">
            <thead className="bg-slate-900 text-xs uppercase tracking-wider text-slate-300">
              <tr>
                <th className="px-5 py-3 font-semibold">S.No</th>
                <th className="px-5 py-3 font-semibold">Bill No</th>
                <th className="px-5 py-3 font-semibold">Date</th>
                <th className="px-5 py-3 font-semibold">Customer</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 text-right font-semibold">Lines</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-500">Loading sales orders…</td></tr>
              ) : orders.filter(o => 
                  o.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                  (o.order_number && `SO-${o.order_number}`.toLowerCase().includes(searchTerm.toLowerCase()))
                ).length ? (
                orders
                  .filter(o => o.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) || (o.order_number && `SO-${o.order_number}`.toLowerCase().includes(searchTerm.toLowerCase())))
                  .map((order, idx) => {
                  const isConfirmed = order.status === 'Confirmed' || order.status === 'Fully Delivered';
                  return (
                    <tr key={order.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setViewOrder(order)}>
                      <td className="px-5 py-4 text-slate-400">{idx + 1}</td>
                      <td className="px-5 py-4 font-mono font-medium text-slate-800">
                        {order.order_number ? `SO-${order.order_number}` : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {order.created_at
                          ? new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                          : '—'}
                      </td>
                      <td className="px-5 py-4 font-medium text-slate-800">{order.customer_name}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          isConfirmed ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right tabular-nums text-slate-600">{order.sales_order_lines?.length ?? order.line_count ?? 0}</td>
                    </tr>
                  );
                })
              ) : (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-500">No sales orders found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}
    </section>
  );
}
