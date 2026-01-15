import React from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import RequireRole from './components/RequireRole';
import RedirectOnLogin from './components/RedirectOnLogin';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import RequestLeave from './pages/RequestLeave';
import Calendar from './pages/Calendar';
import HRDashboard from './pages/HRDashboard';
import HRSettings from './pages/HRSettings';
import Reports from './pages/Reports';
import Profile from './pages/Profile';
import ManagerLogin from './pages/ManagerLogin';
import Manager2FA from './pages/Manager2FA';
import ManagerLayout from './src/components/ManagerLayout';
import { AuthProvider, useAuth } from './contexts/AuthContext';

const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="flex h-screen items-center justify-center text-primary">Loading...</div>;
  }

  if (!session) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};


const ManagerAuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, loading, role, profile } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="flex h-screen items-center justify-center text-primary font-display">Carregando...</div>;
  }

  // 1. Must be logged in
  if (!session) {
    return <Navigate to="/manager/login" state={{ from: location }} replace />;
  }

  // 2. Wait for profile to ensure role is determined
  if (!profile) {
    return <div className="flex h-screen items-center justify-center text-primary font-display">Carregando perfil...</div>;
  }

  // 3. Must be manager or hr_admin
  if (role !== 'manager' && role !== 'hr_admin') {
    console.warn('ManagerAuthGuard: User role is not authorized:', role);
    return <Navigate to="/dashboard" replace />;
  }

  // 4. Must have verified 2FA (Skip in DEV mode)
  const isDev = import.meta.env.DEV;
  const is2FAVerified = sessionStorage.getItem('is2FAVerified') === 'true' || isDev;

  if (!is2FAVerified) {
    return <Navigate to="/manager/verify-2fa" replace />;
  }

  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  const { session, role, loading } = useAuth();

  if (loading) {
    return <div className="flex h-screen items-center justify-center text-primary">Loading...</div>;
  }

  return (
    <>
      <Routes>
        {/* Auth Routes */}
        <Route path="/manager/login" element={session && (role === 'manager' || role === 'hr_admin') ? <Navigate to="/hr" replace /> : <ManagerLogin />} />
        <Route path="/manager/verify-2fa" element={<Manager2FA />} />
        <Route path="/" element={session ? <RedirectOnLogin /> : <Login />} />

        {/* Manager Routes Group - Checked first */}
        <Route path="/hr/*" element={
          <ManagerAuthGuard>
            <ManagerLayout>
              <Routes>
                <Route index element={<HRDashboard />} />
                <Route path="settings" element={<HRSettings />} />
                <Route path="*" element={<Navigate to="/hr" replace />} />
              </Routes>
            </ManagerLayout>
          </ManagerAuthGuard>
        } />

        {/* Catch-all for App Routes (Employee) */}
        <Route
          path="/*"
          element={
            <RequireAuth>
              <Layout>
                <Routes>
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="request" element={<RequestLeave />} />
                  <Route path="request/:id" element={<RequestLeave />} />
                  <Route path="calendar" element={<Calendar />} />
                  <Route path="reports" element={<Reports />} />
                  <Route path="profile" element={<Profile />} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </Layout>
            </RequireAuth>
          }
        />
      </Routes>
    </>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </AuthProvider>
  );
};

export default App;