'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export interface User {
  id: string;
  email: string;
  name: string;
  displayName?: string;
}

export interface Team {
  id: string;
  name: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER' | 'BILLING';
}

interface AuthState {
  user: User | null;
  currentTeam: Team | null;
  teams: Team[];
  instanceRole: 'USER' | 'ADMIN' | null;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, inviteToken?: string | null) => Promise<void>;
  logout: () => Promise<void>;
  switchTeam: (teamId: string) => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'ardine_auth';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    currentTeam: null,
    teams: [],
    instanceRole: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Load auth state from server on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Try to load from localStorage first for quick render
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setState(parsed);
      } catch (e) {
        console.error('Failed to parse stored auth:', e);
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    }

    // Then verify with server
    fetch('/api/auth/me', {
      credentials: 'include',
    })
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();

          // Try to restore the previously selected team
          let currentTeam = data.teams[0] || null;
          const storedTeamId = localStorage.getItem('ardine_current_team_id');
          if (storedTeamId) {
            const storedTeam = data.teams.find((t: Team) => t.id === storedTeamId);
            if (storedTeam) {
              currentTeam = storedTeam;
            }
          }

          const newState = {
            user: data.user,
            currentTeam,
            teams: data.teams,
            instanceRole: data.instanceRole,
          };
          setState(newState);
        } else {
          // Not authenticated, clear state
          setState({
            user: null,
            currentTeam: null,
            teams: [],
            instanceRole: null,
          });
        }
      })
      .catch((error) => {
        console.error('Failed to fetch user:', error);
        // Clear state on error
        setState({
          user: null,
          currentTeam: null,
          teams: [],
          instanceRole: null,
        });
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  // Save auth state to localStorage whenever it changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (state.user) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, [state]);

  const login = async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    const data = await response.json();

    const newState = {
      user: data.user,
      currentTeam: data.teams[0] || null,
      teams: data.teams,
      instanceRole: data.instanceRole,
    };

    setState(newState);
  };

  const register = async (name: string, email: string, password: string, inviteToken?: string | null) => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, email, password, inviteToken }),
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Registration failed');
    }

    const data = await response.json();

    // Set current team to first team (their newly created team)
    const currentTeam = data.teams[0];

    // Save team selection to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('ardine_current_team_id', currentTeam.id);
    }

    const newState: AuthState = {
      user: data.user,
      currentTeam,
      teams: data.teams,
      instanceRole: data.instanceRole,
    };

    setState(newState);
  };

  const logout = async () => {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });

    // Clear persisted team ID
    if (typeof window !== 'undefined') {
      localStorage.removeItem('ardine_current_team_id');
    }

    setState({
      user: null,
      currentTeam: null,
      teams: [],
      instanceRole: null,
    });
  };

  const switchTeam = (teamId: string) => {
    const team = state.teams.find(t => t.id === teamId);
    if (team) {
      setState(prev => ({ ...prev, currentTeam: team }));
      // Persist the selected team ID to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('ardine_current_team_id', teamId);
      }
    }
  };

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    switchTeam,
    isAuthenticated: !!state.user,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * Hook to check if the current user can manage team resources (create/edit projects, clients, etc.)
 * Only OWNER and ADMIN have these permissions.
 */
export function useCanManageTeam(): boolean {
  const { currentTeam } = useAuth();
  return currentTeam?.role === 'OWNER' || currentTeam?.role === 'ADMIN';
}

/**
 * Hook to check if the current user can access invoicing features.
 * Only OWNER, ADMIN, and BILLING have access to invoices.
 */
export function useCanAccessInvoices(): boolean {
  const { currentTeam } = useAuth();
  return currentTeam?.role === 'OWNER' || currentTeam?.role === 'ADMIN' || currentTeam?.role === 'BILLING';
}

/**
 * Hook to check if the current user can see financial information (rates, amounts, budgets).
 * Only OWNER, ADMIN, and BILLING can see financial data. MEMBER and VIEWER cannot.
 */
export function useCanAccessFinancials(): boolean {
  const { currentTeam } = useAuth();
  return currentTeam?.role === 'OWNER' || currentTeam?.role === 'ADMIN' || currentTeam?.role === 'BILLING';
}
