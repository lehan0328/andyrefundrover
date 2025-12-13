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
  const { user, loading, isAdmin, isCustomer } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
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
