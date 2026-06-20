import Card from '../components/Card';
import { Package, ShoppingCart, Truck, Factory } from 'lucide-react';

export default function Dashboard() {
  const stats = [
    { name: 'Total Products', value: '124', icon: Package, color: 'text-blue-400' },
    { name: 'Pending Sales', value: '12', icon: ShoppingCart, color: 'text-emerald-400' },
    { name: 'Active POs', value: '5', icon: Truck, color: 'text-amber-400' },
    { name: 'Open MOs', value: '3', icon: Factory, color: 'text-purple-400' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-100">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.name} className="flex items-center space-x-4">
            <div className={`p-3 rounded-lg bg-slate-800/50 ${stat.color}`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-400 font-medium">{stat.name}</p>
              <p className="text-2xl font-bold text-slate-100">{stat.value}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h2 className="text-lg font-medium text-slate-200 mb-4">Recent Sales Orders</h2>
          <div className="text-slate-400 text-sm">Loading recent orders...</div>
        </Card>
        <Card>
          <h2 className="text-lg font-medium text-slate-200 mb-4">Inventory Alerts</h2>
          <div className="text-slate-400 text-sm">All stock levels are optimal.</div>
        </Card>
      </div>
    </div>
  );
}
