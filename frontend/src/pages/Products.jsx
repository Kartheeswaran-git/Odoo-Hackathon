import { useState, useEffect } from 'react';
import Card from '../components/Card';
import Table from '../components/Table';
import api from '../api';
import { Plus } from 'lucide-react';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/products')
      .then(res => setProducts(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const columns = [
    { header: 'ID', accessor: 'id' },
    { header: 'SKU', accessor: 'sku' },
    { header: 'Name', accessor: 'name' },
    { header: 'Cost Price', accessor: 'cost_price', render: (row) => `$${row.cost_price}` },
    { header: 'Sales Price', accessor: 'sales_price', render: (row) => `$${row.sales_price}` },
    { header: 'On Hand', accessor: 'on_hand_qty' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-100">Products</h1>
        <button className="flex items-center space-x-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg transition-colors shadow-lg shadow-emerald-500/20">
          <Plus className="w-4 h-4" />
          <span>New Product</span>
        </button>
      </div>

      <Card>
        {loading ? (
          <div className="text-slate-400">Loading products...</div>
        ) : (
          <Table columns={columns} data={products} />
        )}
      </Card>
    </div>
  );
}
