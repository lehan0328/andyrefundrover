import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireCustomer?: boolean;
}

export const ProtectedRoute = ({ 
  children, 
  requireAdmin = false,
  requireCustomer = false
}: ProtectedRouteProps) => {
  const { user, loading, isAdmin, isCustomer, userRole } = useAuth();
  const location = useLocation();

  // Show loading while auth is initializing
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not authenticated - redirect to landing
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // User is authenticated but role hasn't been fetched yet - show loading
  // This prevents premature redirects for new signups
  if (userRole === null && (requireAdmin || requireCustomer)) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If admin access is required but user is not admin
  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  // If customer access is required but user is not customer
  if (requireCustomer && !isCustomer) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
