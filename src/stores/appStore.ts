import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppState {
  // Sidebar state
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  
  // Theme
  theme: 'light' | 'dark';
  
  // Offline mode
  isOnline: boolean;
  pendingSyncCount: number;
  
  // Actions
  toggleSidebar: () => void;
  toggleSidebarCollapse: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setOnlineStatus: (isOnline: boolean) => void;
  setPendingSyncCount: (count: number) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      sidebarCollapsed: false,
      theme: 'light',
      isOnline: navigator.onLine,
      pendingSyncCount: 0,

      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      toggleSidebarCollapse: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setTheme: (theme) => set({ theme }),
      setOnlineStatus: (isOnline) => set({ isOnline }),
      setPendingSyncCount: (count) => set({ pendingSyncCount: count }),
    }),
    {
      name: 'pharmacie-app',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        theme: state.theme,
      }),
    }
  )
);

// Écouter les changements de connexion
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    useAppStore.getState().setOnlineStatus(true);
  });
  
  window.addEventListener('offline', () => {
    useAppStore.getState().setOnlineStatus(false);
  });
}

