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
import Reports from './pages/Reports';
import Profile from './pages/Profile';
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

const AppRoutes: React.FC = () => {
  const { session } = useAuth();

  return (
    <>
      {/* RedirectOnLogin handles automatic redirect after login based on role */}
      <RedirectOnLogin />

      <Routes>
        <Route path="/" element={session ? <Navigate to="/dashboard" replace /> : <Login />} />
        <Route
          path="/*"
          element={
            <RequireAuth>
              <Layout>
                <Routes>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/request" element={<RequestLeave />} />
                  <Route path="/request/:id" element={<RequestLeave />} />
                  <Route path="/calendar" element={<Calendar />} />
                  <Route path="/hr" element={
                    <RequireRole roles={['manager', 'hr_admin']}>
                      <HRDashboard />
                    </RequireRole>
                  } />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/profile" element={<Profile />} />
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