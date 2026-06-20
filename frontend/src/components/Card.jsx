export default function Card({ children, className = '' }) {
  return (
    <div className={`bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(16,185,129,0.05)] hover:border-slate-700/60 ${className}`}>
      {children}
    </div>
  );
}
