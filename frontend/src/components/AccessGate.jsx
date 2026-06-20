import { useModuleAccess } from '../hooks/useModuleAccess';

export default function AccessGate({ module, children }) {
  const { loading, canAccess } = useModuleAccess();
  if (loading) return <div className="py-12 text-sm text-slate-500">Checking access…</div>;
  if (!canAccess(module)) return <section><p className="text-sm font-semibold text-safety">Access restricted</p><h1 className="mt-1 text-2xl font-bold text-slate-800">You do not have access to this module</h1><p className="mt-2 text-slate-500">Ask an administrator to assign the required ERP role.</p></section>;
  return children;
}
