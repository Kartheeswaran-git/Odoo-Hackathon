import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useModuleAccess } from '../hooks/useModuleAccess';

const LOW_STOCK_LIMIT = 5;
const formatQty = (value) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 3 }).format(Number(value));
const formatCurrency = (value) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(value));

const EMPTY_PRODUCT = {
  name: '', sku: '', sales_price: '', cost_price: '',
  qty_on_hand: '0', procurement_type: 'Buy',
};

export default function ProductLedger() {
  const { can } = useModuleAccess();
  const [products, setProducts] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [draft, setDraft] = useState(EMPTY_PRODUCT);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    async function loadProducts() {
      try { setProducts(await api.inventory()); } catch (e) { setError(e.message); }
      setLoading(false);
    }
    loadProducts();
  }, []);

  function set(field, value) {
    setDraft((d) => ({ ...d, [field]: value }));
  }

  async function saveProduct(e) {
    e.preventDefault();
    if (!draft.name.trim()) { setError('Product name is required.'); return; }
    setSaving(true);
    setError('');
    try {
      // Save via module_records for now (backend generic module endpoint)
      const row = await api.createModule('items', {
        name: draft.name.trim(),
        sku: draft.sku.trim() || `SKU-${Date.now()}`,
        sales_price: draft.sales_price || '0',
        cost_price: draft.cost_price || '0',
        qty_on_hand: draft.qty_on_hand || '0',
        qty_reserved: '0',
        qty_free_to_use: draft.qty_on_hand || '0',
        procurement_type: draft.procurement_type,
        procure_on_demand: false,
      });
      setProducts((cur) => [row, ...cur]);
      setDraft(EMPTY_PRODUCT);
      setIsAdding(false);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  const visible = query.trim()
    ? products.filter((p) => [p.name, p.sku].some((v) => String(v ?? '').toLowerCase().includes(query.toLowerCase())))
    : products;

  if (loading) return <div className="py-12 text-sm text-slate-500">Loading products…</div>;

  return (
    <section aria-labelledby="product-ledger-title">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-sm font-semibold text-safety">Inventory</p>
          <h1 id="product-ledger-title" className="text-2xl font-bold tracking-tight text-slate-800">Products</h1>
          <p className="mt-1 text-sm text-slate-500">Free-to-Use = On-Hand − Reserved</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">{products.length} products</span>
          {can('items', 'create') && (
            <button
              type="button"
              onClick={() => { setIsAdding(true); setError(''); }}
              className="rounded-md bg-safety px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-safety-dark"
            >
              + Add Product
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div role="alert" className="mb-4 rounded-md border border-orange-200 bg-orange-50 p-3 text-sm text-orange-800">
          {error}
        </div>
      )}

      {/* Add Product Form */}
      {isAdding && (
        <form
          onSubmit={saveProduct}
          className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800">Add New Product</h2>
            <button
              type="button"
              onClick={() => { setIsAdding(false); setDraft(EMPTY_PRODUCT); setError(''); }}
              className="text-sm font-semibold text-slate-500 hover:text-slate-800"
            >
              ✕ Cancel
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Product Name */}
            <div className="sm:col-span-2 lg:col-span-2">
              <label className="block text-sm font-semibold text-slate-700">
                Product Name <span className="text-orange-500">*</span>
              </label>
              <input
                required
                value={draft.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="e.g. Dining Table"
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-slate-800 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
              />
            </div>

            {/* SKU */}
            <div>
              <label className="block text-sm font-semibold text-slate-700">SKU</label>
              <input
                value={draft.sku}
                onChange={(e) => set('sku', e.target.value)}
                placeholder="Auto-generated if empty"
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-slate-800 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
              />
            </div>

            {/* Sales Price */}
            <div>
              <label className="block text-sm font-semibold text-slate-700">Sales Price (₹)</label>
              <input
                type="number" min="0" step="0.01"
                value={draft.sales_price}
                onChange={(e) => set('sales_price', e.target.value)}
                placeholder="0.00"
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-slate-800 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
              />
            </div>

            {/* Cost Price */}
            <div>
              <label className="block text-sm font-semibold text-slate-700">Cost Price (₹)</label>
              <input
                type="number" min="0" step="0.01"
                value={draft.cost_price}
                onChange={(e) => set('cost_price', e.target.value)}
                placeholder="0.00"
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-slate-800 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
              />
            </div>

            {/* Opening Stock */}
            <div>
              <label className="block text-sm font-semibold text-slate-700">Opening Stock (Qty)</label>
              <input
                type="number" min="0" step="0.001"
                value={draft.qty_on_hand}
                onChange={(e) => set('qty_on_hand', e.target.value)}
                placeholder="0"
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-slate-800 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
              />
            </div>

            {/* Procurement Type */}
            <div className="sm:col-span-2 lg:col-span-3">
              <p className="mb-2 text-sm font-semibold text-slate-700">Procurement Type</p>
              <div className="flex flex-wrap gap-3">
                {['Buy', 'Manufacture', 'Make to Order'].map((opt) => (
                  <label
                    key={opt}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border-2 px-4 py-2 text-sm font-semibold transition-all select-none ${
                      draft.procurement_type === opt
                        ? 'border-orange-500 bg-orange-50 text-orange-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-orange-300'
                    }`}
                  >
                    <span className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all ${draft.procurement_type === opt ? 'border-orange-500 bg-orange-500' : 'border-slate-300'}`}>
                      {draft.procurement_type === opt && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                    </span>
                    <input type="radio" name="procurement_type" value={opt} checked={draft.procurement_type === opt} onChange={() => set('procurement_type', opt)} className="sr-only" />
                    {opt}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => { setIsAdding(false); setDraft(EMPTY_PRODUCT); }}
              className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-safety px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-safety-dark disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save Product'}
            </button>
          </div>
        </form>
      )}

      {/* Search */}
      <div className="mb-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products by name or SKU…"
          className="w-full max-w-sm rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none focus:border-safety focus:ring-2 focus:ring-orange-100"
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[52rem] text-left text-sm">
            <thead className="bg-slate-900 text-xs uppercase tracking-wider text-slate-300">
              <tr>
                <th className="px-5 py-3 font-semibold">Product</th>
                <th className="px-5 py-3 font-semibold">SKU</th>
                <th className="px-5 py-3 font-semibold">Type</th>
                <th className="px-5 py-3 text-right font-semibold">Sales Price</th>
                <th className="px-5 py-3 text-right font-semibold">Cost Price</th>
                <th className="px-5 py-3 text-right font-semibold">On-Hand</th>
                <th className="px-5 py-3 text-right font-semibold">Reserved</th>
                <th className="px-5 py-3 text-right font-semibold">Free-to-Use</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((product) => {
                const low = Number(product.qty_free_to_use) <= LOW_STOCK_LIMIT;
                return (
                  <tr key={product.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4 font-medium text-slate-800">{product.name}</td>
                    <td className="px-5 py-4 font-mono text-xs text-slate-500">{product.sku}</td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                        {product.procurement_type ?? 'Buy'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right tabular-nums text-slate-700">{formatCurrency(product.sales_price)}</td>
                    <td className="px-5 py-4 text-right tabular-nums text-slate-700">{formatCurrency(product.cost_price)}</td>
                    <td className="px-5 py-4 text-right tabular-nums text-slate-700">{formatQty(product.qty_on_hand)}</td>
                    <td className="px-5 py-4 text-right tabular-nums text-slate-700">{formatQty(product.qty_reserved)}</td>
                    <td className={`px-5 py-4 text-right font-bold tabular-nums ${low ? 'text-safety' : 'text-slate-800'}`}>
                      {formatQty(product.qty_free_to_use)}
                      {low && <span className="ml-2 rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-orange-700">Low</span>}
                    </td>
                  </tr>
                );
              })}
              {!visible.length && (
                <tr><td colSpan="8" className="px-5 py-10 text-center text-slate-500">No products found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
