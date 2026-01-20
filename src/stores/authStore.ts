import { create } from 'zustand';
import authService from '../services/auth';

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  role: string;
  role_display: string;
  first_name: string;
  last_name: string;
  avatar?: string;
  is_admin: boolean;
  can_edit_inventory: boolean;
  can_view_analytics: boolean;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  updateUser: (user: Partial<AuthUser>) => void;
}

// Helper function to get initial state from localStorage
const getInitialAuthState = (): { user: AuthUser | null; isAuthenticated: boolean } => {
  try {
    const storedToken = localStorage.getItem('access_token');
    const storedUserStr = localStorage.getItem('user');
    
    if (storedToken && storedUserStr) {
      const user = JSON.parse(storedUserStr);
      console.log('[AuthStore] Init: Found existing session for:', user?.username);
      return { user, isAuthenticated: true };
    }
  } catch (e) {
    console.log('[AuthStore] Init: Error parsing stored user');
  }
  console.log('[AuthStore] Init: No existing session');
  return { user: null, isAuthenticated: false };
};

const initialState = getInitialAuthState();

export const useAuthStore = create<AuthState>((set) => ({
  user: initialState.user,
  isAuthenticated: initialState.isAuthenticated,
  isLoading: false,
  error: null,

  login: async (username: string, password: string) => {
    console.log('[AuthStore] Login attempt for:', username);
    set({ isLoading: true, error: null });
    
    try {
      const response = await authService.login(username, password);
      console.log('[AuthStore] Login response received:', response.user?.username);
      
      // authService.login already stores tokens in localStorage
      // Now update the Zustand state
      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
      
      console.log('[AuthStore] State updated, isAuthenticated: true');
      return; // Success - let caller handle navigation
    } catch (error: any) {
      console.error('[AuthStore] Login failed:', error);
      const errorMsg = error.response?.data?.detail || 
                       error.response?.data?.message || 
                       'Login failed, please check username and password';
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: errorMsg,
      });
      throw error;
    }
  },

  logout: () => {
    console.log('[AuthStore] Logging out...');
    authService.logout();
    set({
      user: null,
      isAuthenticated: false,
      error: null,
    });
  },

  clearError: () => {
    set({ error: null });
  },

  updateUser: (userData: Partial<AuthUser>) => {
    set((state) => {
      if (state.user) {
        const updatedUser = { ...state.user, ...userData };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        return { user: updatedUser };
      }
      return {};
    });
  },
}));

export default useAuthStore;
