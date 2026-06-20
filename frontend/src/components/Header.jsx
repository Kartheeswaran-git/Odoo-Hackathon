import { Menu } from 'lucide-react';

export default function Header({ onMenuClick }) {
  return (
    <header className="h-16 bg-slate-900/40 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-4 md:px-8 text-slate-300">
      <div className="flex items-center space-x-4">
        <button onClick={onMenuClick} className="p-2 rounded-lg hover:bg-slate-800 lg:hidden transition-colors">
          <Menu className="w-6 h-6 text-slate-300" />
        </button>
        {/* Search or breadcrumbs could go here */}
      </div>
      <div className="flex items-center space-x-4">
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white font-bold shadow-lg shadow-emerald-500/20">
          A
        </div>
        <span className="font-medium text-slate-200 hidden sm:block">Admin User</span>
      </div>
    </header>
  );
}
