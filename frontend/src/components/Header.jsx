export default function Header() {
  return (
    <header className="h-16 bg-slate-900/50 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-8 text-slate-300">
      <div className="flex items-center space-x-4">
        {/* Search or breadcrumbs could go here */}
      </div>
      <div className="flex items-center space-x-4">
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white font-bold">
          A
        </div>
        <span className="font-medium text-slate-200">Admin User</span>
      </div>
    </header>
  );
}
