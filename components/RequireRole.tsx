import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface RequireRoleProps {
    children: React.ReactNode;
    roles: ('employee' | 'manager' | 'hr_admin')[];
    redirectTo?: string;
}

/**
 * Guard component that restricts access based on user role.
 * Uses role from AuthContext (which reads from profiles table).
 */
const RequireRole: React.FC<RequireRoleProps> = ({
    children,
    roles,
    redirectTo = '/dashboard'
}) => {
    const { user, role, loading } = useAuth();
    const location = useLocation();

    // Show loading while auth is being determined
    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center text-primary">
                Loading...
            </div>
        );
    }

    // Redirect to login if not authenticated
    if (!user) {
        return <Navigate to="/" state={{ from: location }} replace />;
    }

    // Check if user's role is in allowed roles
    if (!roles.includes(role)) {
        if (process.env.NODE_ENV === 'development') {
            console.log('[RequireRole] Access denied:', { userRole: role, requiredRoles: roles });
        }
        return <Navigate to={redirectTo} replace />;
    }

    return <>{children}</>;
};

export default RequireRole;
