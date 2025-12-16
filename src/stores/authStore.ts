import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '@/services/api';

interface User {
  id: number;
  email: string;
  username: string;
  full_name: string | null;
  role: string;
  pharmacy_id: number | null;
  is_active: boolean;
  is_superuser: boolean;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  login: (credentials: { email?: string; username?: string; password: string }) => Promise<User | null>;
  logout: () => void;
  refreshAuth: () => Promise<void>;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (credentials) => {
        set({ isLoading: true });
        try {
          console.log('[Auth] Tentative de connexion à:', api.defaults.baseURL);
          const response = await api.post('/auth/login', credentials);
          const { access_token, refresh_token } = response.data;
          
          // Stocker les tokens
          set({
            accessToken: access_token,
            refreshToken: refresh_token,
            isAuthenticated: true,
          });
          
          // Récupérer les infos utilisateur
          const userResponse = await api.get('/auth/me');
          const user = userResponse.data;
          set({ user });
          console.log('[Auth] Connexion réussie pour:', user.email);
          return user; // Retourner l'utilisateur pour la redirection
        } catch (error: any) {
          console.error('[Auth] Erreur de connexion:', {
            message: error.message,
            code: error.code,
            response: error.response?.status,
            baseURL: api.defaults.baseURL,
            url: error.config?.url,
          });
          set({ isAuthenticated: false, user: null });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      logout: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        });
      },

      refreshAuth: async () => {
        const { refreshToken } = get();
        if (!refreshToken) {
          get().logout();
          return;
        }
        
        try {
          const response = await api.post('/auth/refresh', {
            refresh_token: refreshToken,
          });
          
          const { access_token, refresh_token: newRefreshToken } = response.data;
          set({
            accessToken: access_token,
            refreshToken: newRefreshToken,
          });
        } catch {
          get().logout();
        }
      },

      setUser: (user) => set({ user }),
    }),
    {
      name: 'pharmacie-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

