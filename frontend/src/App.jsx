import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import BOM from './pages/BOM';
import Sales from './pages/Sales';
import Purchases from './pages/Purchases';
import Manufacturing from './pages/Manufacturing';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <Router>
      <div className="flex h-screen bg-slate-950 overflow-hidden font-sans text-slate-200">
        <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
        <div className="flex-1 flex flex-col relative w-full lg:w-auto">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-purple-500/5 pointer-events-none" />
          <Header onMenuClick={() => setSidebarOpen(true)} />
          <main className="flex-1 overflow-y-auto p-4 md:p-8 relative z-10 w-full overflow-x-hidden">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/products" element={<Products />} />
              <Route path="/bom" element={<BOM />} />
              <Route path="/sales" element={<Sales />} />
              <Route path="/purchases" element={<Purchases />} />
              <Route path="/manufacturing" element={<Manufacturing />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;
