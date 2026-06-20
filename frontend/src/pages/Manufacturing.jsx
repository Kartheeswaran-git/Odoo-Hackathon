import { useState, useEffect } from 'react';
import Card from '../components/Card';
import Table from '../components/Table';
import api from '../api';
import { Plus } from 'lucide-react';

export default function Manufacturing() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/manufacturing')
      .then(res => setOrders(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const columns = [
    { header: 'MO ID', accessor: 'id' },
    { header: 'Product ID', accessor: 'product_id' },
    { header: 'Quantity', accessor: 'quantity' },
    { header: 'Status', accessor: 'status' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-100">Manufacturing Orders</h1>
        <button className="flex items-center space-x-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg transition-colors shadow-lg shadow-emerald-500/20">
          <Plus className="w-4 h-4" />
          <span>New MO</span>
        </button>
      </div>
      <Card>
        {loading ? <div className="text-slate-400">Loading...</div> : <Table columns={columns} data={orders} />}
      </Card>
    </div>
  );
}
