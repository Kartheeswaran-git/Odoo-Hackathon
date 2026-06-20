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

const modulePages = {
  parties: { title: 'Parties', description: 'Manage customers and suppliers in one place.', columns: [['name', 'Name'], ['party_type', 'Type', 'radio', ['Customer', 'Supplier', 'Both']], ['phone', 'Phone'], ['address', 'Address']], rows: [['Priya Interiors', 'Customer', '98765 43210', 'Chennai'], ['Timber Traders', 'Supplier', '98400 11223', 'Chennai']] },
  purchases: { title: 'Purchases', description: 'Create, approve, and receive purchase orders.', columns: [['number', 'PO number'], ['supplier', 'Supplier'], ['status', 'Status'], ['total', 'Total']], rows: [['PO-1001', 'Timber Traders', 'Draft', '₹18,500']] },
  manufacturing: { title: 'Manufacturing', description: 'Create and track furniture production orders.', columns: [['order', 'MO number'], ['product', 'Finished product'], ['quantity', 'Quantity'], ['status', 'Status']], rows: [['MO-1001', 'Dining Table', '10', 'Draft']] },
  'bill-of-materials': { title: 'Bill of Materials', description: 'Define the components required for every finished product.', columns: [['product', 'Product'], ['version', 'Version'], ['components', 'Components']], rows: [['Dining Table', '1', 'Legs, Top, Screws']] },
  reports: { title: 'Reports', description: 'Review operational and inventory performance.', columns: [['name', 'Report'], ['period', 'Period'], ['status', 'Status']], rows: [['Inventory valuation', 'Current month', 'Ready'], ['Sales summary', 'Current month', 'Ready']] },
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
      <Route path="manage-users" element={<AccessGate module="manage_users"><StaffManagementPage /></AccessGate>} />
      <Route path="settings" element={<AccessGate module="settings"><SettingsPage /></AccessGate>} />
      {Object.entries(modulePages).map(([path, page]) => {
        if (path === 'manage-users' || path === 'settings') return null;
        const module = path.replaceAll('-', '_');
        return <Route key={path} path={path} element={<AccessGate module={module}><ModuleTable slug={path} module={module} table={page.table} title={page.title} description={page.description} columns={page.columns.map(([key, label, inputType, options]) => ({ key, label, inputType, options }))} seedRows={page.rows.map((values, index) => ({ id: `${path}-${index}`, ...Object.fromEntries(page.columns.map(([key], columnIndex) => [key, values[columnIndex]])) }))} /></AccessGate>} />;
      })}
    </Route>
    <Route path="*" element={<Navigate to="/login" replace />} />
  </Routes>;
}
