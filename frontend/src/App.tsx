import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import RMADetail from './pages/RMADetail';
import AdminDashboard from './pages/AdminDashboard';
import AdminRMAManagement from './pages/AdminRMAManagement';
import AdminStaleConfig from './pages/AdminStaleConfig';
import CreateRMA from './pages/CreateRMA';
import { getToken, setToken, redirectToLogin } from './utils/auth';

function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Handle token from URL parameter FIRST
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('token');
    
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
      window.history.replaceState({}, document.title, window.location.pathname);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsReady(true);
    } else if (!getToken()) {
      redirectToLogin();
    } else {
      setIsReady(true);
    }
  }, []);

  if (!isReady) {
    return <div>Loading...</div>;
  }

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/rma/new" element={<CreateRMA />} />
          <Route path="/rma/:id" element={<RMADetail />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/rmas" element={<AdminRMAManagement />} />
          <Route path="/admin/config" element={<AdminStaleConfig />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
