import React from 'react';
import { Toaster } from 'react-hot-toast';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';

// CRM Pages
import { CrmDashboard } from './pages/crm/Dashboard';
import { Inbox } from './pages/crm/Inbox';
import { CustomersList } from './pages/crm/CustomersList';
import { BotSettings } from './pages/crm/BotSettings';
import { Faqs } from './pages/crm/Faqs';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { BusinessesList } from './pages/admin/BusinessesList';

function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" toastOptions={{ style: { background: '#1e293b', color: '#e2e8f0', border: '1px solid #334155', fontSize: '13px' }, success: { iconTheme: { primary: '#10b981', secondary: '#fff' } }, error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } } }} />
      <BrowserRouter>
        <Routes>
          {/* Ruta pública */}
          <Route path="/login" element={<Login />} />

          {/* Rutas protegidas para Business Admin (y Super Admin) */}
          <Route element={<ProtectedRoute allowedRoles={['business_admin', 'super_admin']} />}>
            <Route element={<Layout />}>
              <Route path="/crm" element={<CrmDashboard />} />
              <Route path="/crm/inbox" element={<Inbox />} />
              <Route path="/crm/customers" element={<CustomersList />} />
              <Route path="/crm/config" element={<BotSettings />} />
              <Route path="/crm/faqs" element={<Faqs />} />
            </Route>
          </Route>

          {/* Rutas exclusivas para Super Admin */}
          <Route element={<ProtectedRoute allowedRoles={['super_admin']} />}>
            <Route element={<Layout />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/businesses" element={<BusinessesList />} />
            </Route>
          </Route>

          {/* Fallback de redirección */}
          <Route path="*" element={<Navigate to="/crm" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
