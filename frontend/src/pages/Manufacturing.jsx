import { useState, useEffect } from 'react';
import Card from '../components/Card';
import Table from '../components/Table';
import api from '../api';
import { Plus, Factory } from 'lucide-react';

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
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-purple-500/10 text-purple-400 rounded-xl">
            <Factory className="w-6 h-6" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-100 tracking-tight">Manufacturing Orders</h1>
        </div>
        <button className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white px-5 py-2.5 rounded-xl transition-all duration-300 shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] hover:-translate-y-0.5 font-medium">
          <Plus className="w-5 h-5" />
          <span>New MO</span>
        </button>
      </div>
      <Card className="p-0 overflow-hidden">
        {loading ? <div className="p-8 text-center text-slate-400 animate-pulse">Loading manufacturing data...</div> : <Table columns={columns} data={orders} />}
      </Card>
    </div>
  );
}
