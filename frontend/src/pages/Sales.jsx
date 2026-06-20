import { useState, useEffect } from 'react';
import Card from '../components/Card';
import Table from '../components/Table';
import api from '../api';
import { Plus, ShoppingCart } from 'lucide-react';

export default function Sales() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/sales')
      .then(res => setOrders(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const columns = [
    { header: 'Order ID', accessor: 'id' },
    { header: 'Customer', accessor: 'customer_name' },
    { header: 'Status', accessor: 'status' },
    { header: 'Date', accessor: 'created_at', render: (row) => new Date(row.created_at).toLocaleDateString() },
  ];

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <ShoppingCart className="w-6 h-6" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-100 tracking-tight">Sales Orders</h1>
        </div>
        <button className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white px-5 py-2.5 rounded-xl transition-all duration-300 shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] hover:-translate-y-0.5 font-medium">
          <Plus className="w-5 h-5" />
          <span>New Order</span>
        </button>
      </div>
      <Card className="p-0 overflow-hidden">
        {loading ? <div className="p-8 text-center text-slate-400 animate-pulse">Loading sales data...</div> : <Table columns={columns} data={orders} />}
      </Card>
    </div>
  );
}
