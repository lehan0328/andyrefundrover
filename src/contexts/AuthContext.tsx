import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type UserRole = 'admin' | 'customer' | null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userRole: UserRole;
  isAdmin: boolean;
  isCustomer: boolean;
  onboardingCompleted: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  userRole: null,
  isAdmin: false,
  isCustomer: false,
  onboardingCompleted: false,
  refreshProfile: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);

  const fetchUserData = async (userId: string) => {
    try {
      // Fetch User Role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (roleError) {
        console.error('Error fetching user role:', roleError);
      }
      setUserRole(roleData?.role as UserRole || null);

      // Fetch Profile for onboarding status
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching user profile:', profileError);
      }
      setOnboardingCompleted(profileData?.onboarding_completed || false);

    } catch (error) {
      console.error('Error fetching user data:', error);
      setUserRole(null);
      setOnboardingCompleted(false);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchUserData(user.id);
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (mounted) {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchUserData(session.user.id);
        }
        
        setLoading(false);
      }
    };

    initializeAuth();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Defer to avoid Supabase deadlock
          setTimeout(async () => {
            if (mounted) {
              await fetchUserData(session.user.id);
            }
          }, 0);
        } else {
          setUserRole(null);
          setOnboardingCompleted(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const isAdmin = userRole === 'admin';
  const isCustomer = userRole === 'customer';

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      loading, 
      userRole, 
      isAdmin, 
      isCustomer, 
      onboardingCompleted,
      refreshProfile 
    }}>
      {children}
    </AuthContext.Provider>
  );
};