import { Navigate, Route, Routes, useSearchParams } from 'react-router-dom';
import AppShell from './components/AppShell';
import Dashboard from './components/Dashboard';
import AccessGate from './components/AccessGate';
import ModuleTable from './components/ModuleTable';
import ProductLedger from './components/ProductLedger';
import SalesOrders from './components/SalesOrders';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import StaffManagementPage from './pages/StaffManagementPage';
import SettingsPage from './pages/SettingsPage';
import AuditLogsPage from './pages/AuditLogsPage';

import PurchaseOrders from './components/PurchaseOrders';
import ManufacturingOrders from './components/ManufacturingOrders';
import BillsOfMaterials from './components/BillsOfMaterials';

const modulePages = {
  parties: { title: 'Parties', description: 'Manage customers and suppliers in one place.', columns: [['name', 'Name'], ['party_type', 'Type', 'radio', ['Customer', 'Supplier', 'Both']], ['phone', 'Phone'], ['address', 'Address']], rows: [] },
  items: { title: 'Products', description: 'Catalog of furniture and raw materials.', columns: [['name', 'Name'], ['code', 'SKU/Code'], ['price', 'Sale Price', 'number'], ['cost_price', 'Cost Price', 'number'], ['quantity', 'Stock available', 'number'], ['unit', 'Unit', 'radio', ['Units', 'Kg', 'Meters']]], rows: [] },

  'audit-logs': { title: 'Audit Logs', description: 'Review tracked ERP changes and operational events.', columns: [['event', 'Event'], ['module', 'Module'], ['created', 'Created']], rows: [['Sales order confirmed', 'Sales', 'Today']] },
  settings: { title: 'Settings', description: 'Configure business preferences and system defaults.', columns: [['setting', 'Setting'], ['value', 'Value'], ['updated', 'Updated']], rows: [['Company name', 'Shiv Furniture Works', 'Today'], ['Currency', 'INR', 'Today']] },
};

function SalesRoute() {
  const [params] = useSearchParams();
  const opensNewOrder = params.has('new');
  return <SalesOrders key={params.get('new') ?? 'list'} startCreating={opensNewOrder} />;
}

export default function App() {
  return <Routes>
    <Route path="/" element={<Navigate to="/login" replace />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/signup" element={<SignUpPage />} />
    <Route path="/admin" element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
      <Route index element={<AccessGate module="dashboard"><Dashboard /></AccessGate>} />
      <Route path="items" element={<AccessGate module="items"><ProductLedger /></AccessGate>} />
      <Route path="sales" element={<AccessGate module="sales"><SalesRoute /></AccessGate>} />
      <Route path="purchases" element={<AccessGate module="purchases"><PurchaseOrders /></AccessGate>} />
      <Route path="manufacturing" element={<AccessGate module="manufacturing"><ManufacturingOrders /></AccessGate>} />
      <Route path="bill-of-materials" element={<AccessGate module="bill_of_materials"><BillsOfMaterials /></AccessGate>} />
      <Route path="manage-users" element={<AccessGate module="manage_users"><StaffManagementPage /></AccessGate>} />
      <Route path="settings" element={<AccessGate module="settings"><SettingsPage /></AccessGate>} />
      {Object.entries(modulePages).map(([path, page]) => {
        if (path === 'manage-users' || path === 'settings') return null;
        if (path === 'audit-logs') return <Route key={path} path={path} element={<AccessGate module="audit_logs"><AuditLogsPage /></AccessGate>} />;
        const module = path.replaceAll('-', '_');
        return <Route key={path} path={path} element={<AccessGate module={module}><ModuleTable slug={path} module={module} table={page.table} title={page.title} description={page.description} columns={page.columns.map(([key, label, inputType, options]) => ({ key, label, inputType, options }))} seedRows={page.rows.map((values, index) => ({ id: `${path}-${index}`, ...Object.fromEntries(page.columns.map(([key], columnIndex) => [key, values[columnIndex]])) }))} /></AccessGate>} />;
      })}
    </Route>
    <Route path="*" element={<Navigate to="/login" replace />} />
  </Routes>;
}
