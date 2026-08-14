import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';

// CRM Pages
import { CrmDashboard } from './pages/crm/Dashboard';
import { Inbox } from './pages/crm/Inbox';
import { BotSettings } from './pages/crm/BotSettings';
import { Faqs } from './pages/crm/Faqs';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { BusinessesList } from './pages/admin/BusinessesList';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Ruta pública */}
          <Route path="/login" element={<Login />} />

          {/* Rutas protegidas para Business Admin (y Super Admin) */}
          <Route element={<ProtectedRoute allowedRoles={['business_admin', 'super_admin']} />}>
            <Route element={<Layout />}>
              <Route path="/crm" element={<CrmDashboard />} />
              <Route path="/crm/inbox" element={<Inbox />} />
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
