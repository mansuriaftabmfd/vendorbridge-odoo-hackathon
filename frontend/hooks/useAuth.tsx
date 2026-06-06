/**
 * Authentication Hook
 * Manages user authentication state and provides auth methods
 */

'use client';

import { useState, useEffect, createContext, useContext, ReactNode, useCallback, useRef } from 'react';
import { api, ApiError } from '@/lib/api';
import type { User, UserRole, AuthContextType } from '@/lib/auth-types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const sessionCheckRef = useRef<Promise<void> | null>(null);
  const mountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Check session on mount only
  useEffect(() => {
    checkSession();
  }, []);

  // Check if user has valid session (with caching to prevent multiple simultaneous calls)
  const checkSession = useCallback(async () => {
    // If there's already a session check in progress, wait for it
    if (sessionCheckRef.current) {
      return sessionCheckRef.current;
    }

    // Create new session check promise
    sessionCheckRef.current = (async () => {
      try {
        if (!mountedRef.current) return;
        
        setIsLoading(true);
        const response = await api.auth.getSession();
        
        if (!mountedRef.current) return;

        if (response.success && response.authenticated && response.user) {
          // Map backend user to frontend user format
          const backendUser = response.user;
          const frontendUser: User = {
            id: backendUser.id,
            name: backendUser.full_name,
            email: backendUser.email,
            // Normalize to lowercase to match frontend role type (backend sends UPPERCASE)
            role: (backendUser.role as string).toLowerCase() as UserRole,
            organization: backendUser.organization_name || 'Default Organization',
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${backendUser.email}`,
          };
          setUser(frontendUser);
        } else {
          setUser(null);
        }
      } catch (error) {
        if (!mountedRef.current) return;
        
        // Only log non-rate-limit errors
        if (!(error instanceof ApiError) || error.status !== 429) {
          console.error('Session check failed:', error);
        }
        setUser(null);
      } finally {
        if (mountedRef.current) {
          setIsLoading(false);
        }
        // Clear the session check reference
        sessionCheckRef.current = null;
      }
    })();

    return sessionCheckRef.current;
  }, []);

  // Login function
  const login = async (email: string, password: string, role?: UserRole) => {
    setIsLoading(true);
    try {
      // Map frontend lowercase role → backend UPPERCASE for API
      const roleMap: Record<string, string> = {
        procurement_officer: 'PROCUREMENT_OFFICER',
        vendor: 'VENDOR',
        manager: 'MANAGER',
        admin: 'ADMIN',
      };

      const response = await api.auth.login({
        email,
        password,
        remember_me: false,
        // Send requested_role so backend can verify it matches DB
        requested_role: role ? (roleMap[role] || role.toUpperCase()) : undefined,
      });

      if (response.success && response.data?.user) {
        const backendUser = response.data.user;
        const frontendUser: User = {
          id: backendUser.id,
          name: backendUser.full_name,
          email: backendUser.email,
          // Always use DB role, never the frontend selectedRole
          role: backendUser.role.toLowerCase() as UserRole,
          organization: backendUser.organization_name || 'Default Organization',
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${backendUser.email}`,
        };
        setUser(frontendUser);
      } else {
        throw new Error(response.error || 'Login failed');
      }
    } catch (error) {
      if (error instanceof ApiError) {
        // Preserve backend error code for UI-specific error messages
        const err: any = new Error(error.message);
        err.code = error.code || '';
        throw err;
      }
      throw new Error('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Signup function
  const signup = async (name: string, email: string, password: string, role: UserRole, orgName?: string) => {
    setIsLoading(true);
    // Map frontend lowercase roles → backend UPPERCASE roles
    const roleMap: Record<UserRole, string> = {
      procurement_officer: 'PROCUREMENT_OFFICER',
      vendor: 'VENDOR',
      manager: 'MANAGER',
      admin: 'ADMIN',
    };
    const backendRole = roleMap[role] || role.toUpperCase();

    try {
      const response = await api.auth.register({
        email,
        password,
        full_name: name,
        role: backendRole,
        organization: {
          name: orgName || 'Default Organization',
        }
      });
      
      if (!response.success) {
        throw new Error(response.error || 'Registration failed');
      }
      
      // Auto-login after successful registration
      await login(email, password);
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(error.message);
      }
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await api.auth.logout();
    } catch (error) {
      // Even if logout API fails, clear local state
      console.error('Logout API failed:', error);
    } finally {
      setUser(null);
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    signup,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
