export default function Card({ children, className = '' }) {
  return (
    <div className={`bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-xl shadow-lg p-6 ${className}`}>
      {children}
    </div>
  );
}
