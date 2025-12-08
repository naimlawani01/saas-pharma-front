import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/stores/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

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
    
    // Si erreur réseau (pas de réponse), sauvegarder pour sync offline
    if (!error.response && originalRequest && navigator.onLine === false) {
      const { syncService } = await import('./syncService');
      
      // Déterminer le type d'entité et l'endpoint
      const url = originalRequest.url || '';
      const method = (originalRequest.method || 'GET').toUpperCase() as 'POST' | 'PUT' | 'DELETE';
      
      let entity: 'sale' | 'product' | 'customer' | 'supplier' | 'order' = 'sale';
      if (url.includes('/products')) entity = 'product';
      else if (url.includes('/customers')) entity = 'customer';
      else if (url.includes('/suppliers')) entity = 'supplier';
      else if (url.includes('/orders')) entity = 'order';
      // Les sessions de caisse sont traitées comme des ventes pour la sync
      else if (url.includes('/cash')) entity = 'sale';
      
      const type = method === 'POST' ? 'create' : method === 'PUT' ? 'update' : 'delete';
      
      // Sauvegarder l'opération pour synchronisation ultérieure
      if (method !== 'GET') {
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

