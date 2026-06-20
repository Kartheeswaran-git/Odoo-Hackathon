import Card from '../components/Card';
import { Package, ShoppingCart, Truck, Factory } from 'lucide-react';

export default function Dashboard() {
  const stats = [
    { name: 'Total Products', value: '124', icon: Package, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { name: 'Pending Sales', value: '12', icon: ShoppingCart, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    { name: 'Active POs', value: '5', icon: Truck, color: 'text-amber-400', bg: 'bg-amber-400/10' },
    { name: 'Open MOs', value: '3', icon: Factory, color: 'text-purple-400', bg: 'bg-purple-400/10' },
  ];

  return (
    <div className="space-y-6 md:space-y-8">
      <h1 className="text-2xl md:text-3xl font-bold text-slate-100 tracking-tight">Dashboard</h1>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {stats.map((stat) => (
          <Card key={stat.name} className="flex items-center space-x-5 group">
            <div className={`p-4 rounded-xl transition-transform duration-300 group-hover:scale-110 ${stat.bg} ${stat.color}`}>
              <stat.icon className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm text-slate-400 font-medium tracking-wide">{stat.name}</p>
              <p className="text-3xl font-bold text-slate-100 mt-1">{stat.value}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
        <Card className="min-h-[300px] flex flex-col">
          <h2 className="text-lg font-semibold text-slate-200 mb-6">Recent Sales Orders</h2>
          <div className="flex-1 flex flex-col space-y-4">
            {/* Skeleton loaders for premium feel */}
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center space-x-4 animate-pulse">
                <div className="h-12 w-12 bg-slate-800/50 rounded-lg"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-800/50 rounded w-3/4"></div>
                  <div className="h-3 bg-slate-800/50 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card className="min-h-[300px] flex flex-col">
          <h2 className="text-lg font-semibold text-slate-200 mb-6">Inventory Alerts</h2>
          <div className="flex-1 flex items-center justify-center border-2 border-dashed border-slate-800/50 rounded-xl bg-slate-900/20">
            <div className="text-center">
              <Package className="w-10 h-10 text-emerald-500/50 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">All stock levels are optimal.</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
