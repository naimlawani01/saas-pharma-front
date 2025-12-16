import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/stores/authStore';

// Détecter si on est dans Electron
const isElectron = typeof window !== 'undefined' && window.electron === true;

// Récupérer l'URL de l'API
// En mode Electron, toujours utiliser localhost:8000 (backend local)
// En mode web, utiliser la variable d'environnement
let API_URL: string;

if (isElectron) {
  // Mode Electron : backend local
  API_URL = 'http://localhost:8000/api/v1';
  console.log('[API Config] Mode Electron détecté - Backend local');
} else {
  // Mode web : utiliser la config
  API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
  
  // En production web, forcer HTTPS si l'URL est en HTTP
  if (import.meta.env.PROD && API_URL.startsWith('http://') && !API_URL.includes('localhost')) {
    console.warn('[API Config] URL HTTP détectée en production, conversion automatique en HTTPS');
    API_URL = API_URL.replace('http://', 'https://');
  }
}

// Log pour déboguer (uniquement en développement)
if (import.meta.env.DEV || isElectron) {
  console.log('[API Config] API_URL:', API_URL);
  console.log('[API Config] isElectron:', isElectron);
}

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Fonction utilitaire pour vérifier le statut du backend (Electron uniquement)
export async function checkBackendStatus(): Promise<{ running: boolean; url: string; port: number } | null> {
  if (!isElectron || !window.electronAPI?.getBackendStatus) {
    return null;
  }
  return window.electronAPI.getBackendStatus();
}

// Fonction pour redémarrer le backend (Electron uniquement)
export async function restartBackend(): Promise<{ success: boolean; error?: string } | null> {
  if (!isElectron || !window.electronAPI?.restartBackend) {
    return null;
  }
  return window.electronAPI.restartBackend();
}

// Intercepteur pour ajouter le token et gérer le mode offline
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const { accessToken } = useAuthStore.getState();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    
    // Si offline et méthode non-GET, sauvegarder pour sync ultérieure
    if (!navigator.onLine && config.method && ['POST', 'PUT', 'DELETE'].includes(config.method.toUpperCase())) {
      const { syncService } = await import('./syncService');
      
      const url = config.url || '';
      const method = config.method.toUpperCase() as 'POST' | 'PUT' | 'DELETE';
      
      let entity: 'sale' | 'product' | 'customer' | 'supplier' | 'order' = 'sale';
      if (url.includes('/products')) entity = 'product';
      else if (url.includes('/customers')) entity = 'customer';
      else if (url.includes('/suppliers')) entity = 'supplier';
      else if (url.includes('/orders')) entity = 'order';
      // Les sessions de caisse sont traitées comme des ventes pour la sync
      else if (url.includes('/cash')) entity = 'sale';
      
      const type = method === 'POST' ? 'create' : method === 'PUT' ? 'update' : 'delete';
      
      // Sauvegarder l'opération
      await syncService.savePendingOperation(
        type,
        entity,
        url,
        method,
        config.data ? (typeof config.data === 'string' ? JSON.parse(config.data) : config.data) : {}
      );
      
      // Rejeter la requête avec une erreur spéciale pour indiquer qu'elle est en attente
      const offlineError: any = new Error('Offline - Operation saved for sync');
      offlineError.isOffline = true;
      offlineError.config = config;
      offlineError.response = undefined; // Pas de réponse serveur
      return Promise.reject(offlineError);
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercepteur pour gérer les erreurs et le refresh token
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    
    // Si erreur 401 et pas déjà retry
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        await useAuthStore.getState().refreshAuth();
        const { accessToken } = useAuthStore.getState();
        
        if (accessToken) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        }
      } catch {
        useAuthStore.getState().logout();
      }
    }
    
    // Ne pas logger les erreurs 401 dans la console (elles sont normales si l'utilisateur n'est pas authentifié)
    if (error.response?.status === 401) {
      const { isAuthenticated } = useAuthStore.getState();
      if (!isAuthenticated) {
        // Si l'utilisateur n'est pas authentifié, c'est normal, ne pas logger
        const silentError = Object.create(Error.prototype);
        Object.assign(silentError, {
          message: error.message,
          response: error.response,
          config: error.config,
          isAxiosError: true,
          toJSON: error.toJSON,
          toString: () => '',
        });
        return Promise.reject(silentError);
      }
    }
    
    // Si erreur réseau (pas de réponse), sauvegarder pour sync offline
    if (!error.response && originalRequest && navigator.onLine === false) {
      const { syncService } = await import('./syncService');
      
      const url = originalRequest.url || '';
      const method = (originalRequest.method || 'GET').toUpperCase();
      
      // Sauvegarder l'opération pour synchronisation ultérieure (seulement pour les méthodes non-GET)
      if (method !== 'GET' && (method === 'POST' || method === 'PUT' || method === 'DELETE')) {
        const type = method === 'POST' ? 'create' : method === 'PUT' ? 'update' : 'delete';
        
        let entity: 'sale' | 'product' | 'customer' | 'supplier' | 'order' = 'sale';
        if (url.includes('/products')) entity = 'product';
        else if (url.includes('/customers')) entity = 'customer';
        else if (url.includes('/suppliers')) entity = 'supplier';
        else if (url.includes('/orders')) entity = 'order';
        else if (url.includes('/cash')) entity = 'sale';
        await syncService.savePendingOperation(
          type,
          entity,
          url.replace(api.defaults.baseURL || '', ''),
          method,
          originalRequest.data ? (typeof originalRequest.data === 'string' ? JSON.parse(originalRequest.data) : originalRequest.data) : {}
        );
      }
    }
    
    return Promise.reject(error);
  }
);

// Types pour les réponses API
export interface ApiError {
  detail: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
