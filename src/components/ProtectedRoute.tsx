import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: 'admin' | 'edit_inventory' | 'view_analytics' | 'manage_users';
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredPermission 
}) => {
  const location = useLocation();
  
  // Check localStorage directly for auth
  const token = localStorage.getItem('access_token');
  const userStr = localStorage.getItem('user');

  console.log('[ProtectedRoute] Checking auth...');
  console.log('[ProtectedRoute] Token exists:', !!token);
  console.log('[ProtectedRoute] User exists:', !!userStr);
  console.log('[ProtectedRoute] Current path:', location.pathname);

  if (!token) {
    console.log('[ProtectedRoute] No token, redirecting to /login');
    sessionStorage.setItem('auth_debug', JSON.stringify({
      reason: 'missing_token',
      path: location.pathname,
      hasToken: !!token,
      hasUser: !!userStr,
    }));
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  console.log('[ProtectedRoute] Auth OK (token present), rendering children');

  // Parse user for permission checks (optional)
  let user: any = null;
  if (userStr) {
    try {
      user = JSON.parse(userStr);
    } catch {
      console.log('[ProtectedRoute] Failed to parse user, continuing without permissions');
      user = null;
    }
  }

  // Check permissions if required
  if (requiredPermission && user) {
    let hasPermission = false;
    
    switch (requiredPermission) {
      case 'admin':
      case 'manage_users':
        hasPermission = user.is_admin;
        break;
      case 'edit_inventory':
        hasPermission = user.can_edit_inventory;
        break;
      case 'view_analytics':
        hasPermission = user.can_view_analytics;
        break;
      default:
        hasPermission = true;
    }

    if (!hasPermission) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
