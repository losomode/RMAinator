import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@inator/shared/auth/AuthProvider';
import { ProtectedRoute } from '@inator/shared/auth/ProtectedRoute';
import { Layout } from '@inator/shared/layout/Layout';
import type { NavItem } from '@inator/shared/types';
import { Dashboard } from './pages/Dashboard';
import { CreateRMA } from './pages/CreateRMA';
import { RMADetail } from './pages/RMADetail';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminRMAManagement } from './pages/AdminRMAManagement';
import { AdminStaleConfig } from './pages/AdminStaleConfig';
import { GroupDetail } from './pages/GroupDetail';

const NAV_ITEMS: NavItem[] = [
  { path: '/', label: '📋 Dashboard' },
  { path: '/new', label: '➕ New RMA' },
  { path: '/admin', label: '🛠️ Admin Tools', adminOnly: true },
];

/**
 * RMAinator frontend — manages RMA workflow for all users.
 * Served under /rma via Caddy reverse proxy.
 */
export default function App(): React.JSX.Element {
  return (
    <BrowserRouter basename="/rma">
      <AuthProvider>
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout title="RMAinator" navItems={NAV_ITEMS}>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/new"
            element={
              <ProtectedRoute>
                <Layout title="RMAinator" navItems={NAV_ITEMS}>
                  <CreateRMA />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/group/:id"
            element={
              <ProtectedRoute>
                <Layout title="RMAinator" navItems={NAV_ITEMS}>
                  <GroupDetail />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/:id"
            element={
              <ProtectedRoute>
                <Layout title="RMAinator" navItems={NAV_ITEMS}>
                  <RMADetail />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute adminOnly>
                <Layout title="RMAinator" navItems={NAV_ITEMS}>
                  <AdminDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/manage"
            element={
              <ProtectedRoute adminOnly>
                <Layout title="RMAinator" navItems={NAV_ITEMS}>
                  <AdminRMAManagement />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/stale-config"
            element={
              <ProtectedRoute adminOnly>
                <Layout title="RMAinator" navItems={NAV_ITEMS}>
                  <AdminStaleConfig />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
