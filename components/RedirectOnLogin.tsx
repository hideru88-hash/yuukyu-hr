import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * Component that handles automatic redirect after login based on user role.
 * - hr_admin/manager -> /hr
 * - employee -> /dashboard
 */
const RedirectOnLogin: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, role, loading } = useAuth();
    const hasRedirected = useRef(false);

    useEffect(() => {
        // Debug log (dev only)
        if (process.env.NODE_ENV === 'development') {
            console.log('[auth]', {
                uid: user?.id,
                role,
                path: location.pathname,
                loading,
                hasRedirected: hasRedirected.current
            });
        }

        // Don't do anything while loading
        if (loading) return;

        // Don't redirect if no user
        if (!user) {
            hasRedirected.current = false;
            return;
        }

        // Prevent infinite redirect loops - only redirect once per login
        if (hasRedirected.current) return;

        // Only redirect from login page or root
        const isOnLoginPage = location.pathname === '/' || location.pathname === '';
        if (!isOnLoginPage) return;

        // Mark as redirected
        hasRedirected.current = true;

        // Redirect based on role
        if (role === 'hr_admin' || role === 'manager') {
            navigate('/hr', { replace: true });
        } else {
            navigate('/dashboard', { replace: true });
        }
    }, [user, role, loading, navigate, location.pathname]);

    // Reset redirect flag when user logs out
    useEffect(() => {
        if (!user) {
            hasRedirected.current = false;
        }
    }, [user]);

    return null;
};

export default RedirectOnLogin;
