/**
 * Service de synchronisation Cloud
 * Gère la synchronisation bidirectionnelle entre le backend local et le backend cloud
 */

import axios, { AxiosInstance } from 'axios';
import { appConfig } from '@/config/appConfig';
import { useAuthStore } from '@/stores/authStore';

export interface SyncConfig {
  cloudUrl: string;
  apiKey?: string;
  enabled: boolean;
  autoSync: boolean;
  syncInterval: number; // en minutes
}

export interface SyncStatus {
  pharmacy_id: number;
  last_sync_at: string | null;
  last_sync_id: string | null;
  pending_sync: {
    products: number;
    sales: number;
    customers: number;
    total: number;
  };
  is_synced: boolean;
}

export interface SyncResult {
  success: boolean;
  uploaded: number;
  downloaded: number;
  errors: string[];
  timestamp: string;
}

const SYNC_CONFIG_KEY = 'pharmacy_sync_config';
const SYNC_TOKEN_KEY = 'pharmacy_sync_token';

class CloudSyncService {
  private config: SyncConfig | null = null;
  private cloudApi: AxiosInstance | null = null;
  private localApi: AxiosInstance;
  private syncInProgress = false;
  // Utiliser le type navigateur pour compatibilité avec clearInterval
  private autoSyncTimer: number | null = null;

  constructor() {
    // API locale (backend Electron)
    this.localApi = axios.create({
      baseURL: 'http://localhost:8000/api/v1',
      timeout: 30000,
    });

    // Charger la config sauvegardée
    this.loadConfig();
  }

  /**
   * Charger la configuration depuis le localStorage
   */
  loadConfig(): SyncConfig | null {
    try {
      const saved = localStorage.getItem(SYNC_CONFIG_KEY);
      if (saved) {
        this.config = JSON.parse(saved);
      } else {
        // Config par défaut avec l'URL du cloud de l'appConfig
        this.config = {
          cloudUrl: appConfig.CLOUD_SERVER_URL,
          enabled: false,
          autoSync: false,
          syncInterval: 15,
        };
      }
      
      if (this.config?.enabled && this.config?.cloudUrl) {
        this.initCloudApi();
      }
      if (this.config?.autoSync) {
        this.startAutoSync();
      }
    } catch (e) {
      console.error('[CloudSync] Erreur chargement config:', e);
    }
    return this.config;
  }

  /**
   * Sauvegarder la configuration
   */
  saveConfig(config: SyncConfig): void {
    this.config = config;
    localStorage.setItem(SYNC_CONFIG_KEY, JSON.stringify(config));
    
    if (config.enabled && config.cloudUrl) {
      this.initCloudApi();
    } else {
      this.cloudApi = null;
    }

    if (config.autoSync) {
      this.startAutoSync();
    } else {
      this.stopAutoSync();
    }
  }

  /**
   * Obtenir la configuration actuelle
   */
  getConfig(): SyncConfig | null {
    return this.config;
  }

  /**
   * Initialiser l'API cloud
   */
  private initCloudApi(): void {
    if (!this.config?.cloudUrl) return;

    this.cloudApi = axios.create({
      baseURL: this.config.cloudUrl.replace(/\/$/, '') + '/api/v1',
      timeout: 60000,
    });

    // Ajouter le token d'auth cloud si disponible
    const token = localStorage.getItem(SYNC_TOKEN_KEY);
    if (token) {
      this.cloudApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  }

  /**
   * Se connecter au serveur cloud
   */
  async loginToCloud(email: string, password: string): Promise<boolean> {
    if (!this.cloudApi) {
      throw new Error('API cloud non configurée');
    }

    try {
      // Envoyer en JSON (format attendu par le backend)
      const response = await this.cloudApi.post('/auth/login', {
        username: email,
        password: password
      });

      const token = response.data.access_token;
      localStorage.setItem(SYNC_TOKEN_KEY, token);
      this.cloudApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      console.log('[CloudSync] Connexion cloud réussie');
      return true;
    } catch (e: any) {
      console.error('[CloudSync] Erreur connexion cloud:', e.response?.data || e.message);
      throw new Error(e.response?.data?.detail || 'Échec de connexion au cloud');
    }
  }

  /**
   * Vérifier si connecté au cloud
   */
  isCloudConnected(): boolean {
    return !!localStorage.getItem(SYNC_TOKEN_KEY) && !!this.cloudApi;
  }

  /**
   * Se déconnecter du cloud
   */
  logoutFromCloud(): void {
    localStorage.removeItem(SYNC_TOKEN_KEY);
    if (this.cloudApi) {
      delete this.cloudApi.defaults.headers.common['Authorization'];
    }
  }

  /**
   * Obtenir le statut de synchronisation local
   */
  async getLocalSyncStatus(): Promise<SyncStatus | null> {
    try {
      // Récupérer le token depuis le store d'authentification
      const { accessToken, isAuthenticated } = useAuthStore.getState();
      
      // Ne pas faire la requête si l'utilisateur n'est pas authentifié
      if (!isAuthenticated || !accessToken) {
        console.log('[CloudSync] Utilisateur non authentifié, skip statut local');
        return null;
      }
      
      const response = await this.localApi.get('/sync/status', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      return response.data;
    } catch (e) {
      console.error('[CloudSync] Erreur statut local:', e);
      return null;
    }
  }

  /**
   * Synchronisation complète bidirectionnelle
   */
  async fullSync(): Promise<SyncResult> {
    if (this.syncInProgress) {
      return {
        success: false,
        uploaded: 0,
        downloaded: 0,
        errors: ['Synchronisation déjà en cours'],
        timestamp: new Date().toISOString()
      };
    }

    if (!this.config?.enabled || !this.cloudApi) {
      return {
        success: false,
        uploaded: 0,
        downloaded: 0,
        errors: ['Synchronisation cloud non configurée'],
        timestamp: new Date().toISOString()
      };
    }

    this.syncInProgress = true;
    const errors: string[] = [];
    let uploaded = 0;
    let downloaded = 0;

    try {
      // Récupérer le token depuis le store d'authentification
      const { accessToken, isAuthenticated } = useAuthStore.getState();
      
      if (!isAuthenticated || !accessToken) {
        this.syncInProgress = false;
        return {
          success: false,
          uploaded: 0,
          downloaded: 0,
          errors: ['Utilisateur non authentifié'],
          timestamp: new Date().toISOString()
        };
      }
      
      const headers = { Authorization: `Bearer ${accessToken}` };

      // 1. UPLOAD: Envoyer les données locales vers le cloud
      console.log('[CloudSync] Début upload vers cloud...');
      
      // Upload produits
      try {
        const productsResp = await this.localApi.get('/sync/data/products', { headers });
        if (productsResp.data.count > 0) {
          await this.cloudApi.post('/sync/upload', {
            entity_type: 'products',
            items: productsResp.data.data
          });
          uploaded += productsResp.data.count;
          console.log(`[CloudSync] ${productsResp.data.count} produits uploadés`);
        }
      } catch (e: any) {
        errors.push(`Produits: ${e.message}`);
      }

      // Upload clients
      try {
        const customersResp = await this.localApi.get('/sync/data/customers', { headers });
        if (customersResp.data.count > 0) {
          await this.cloudApi.post('/sync/upload', {
            entity_type: 'customers',
            items: customersResp.data.data
          });
          uploaded += customersResp.data.count;
          console.log(`[CloudSync] ${customersResp.data.count} clients uploadés`);
        }
      } catch (e: any) {
        errors.push(`Clients: ${e.message}`);
      }

      // Upload ventes
      try {
        const salesResp = await this.localApi.get('/sync/data/sales', { headers });
        if (salesResp.data.count > 0) {
          await this.cloudApi.post('/sync/upload', {
            entity_type: 'sales',
            items: salesResp.data.data
          });
          uploaded += salesResp.data.count;
          console.log(`[CloudSync] ${salesResp.data.count} ventes uploadées`);
        }
      } catch (e: any) {
        errors.push(`Ventes: ${e.message}`);
      }

      // 2. DOWNLOAD: Récupérer les données du cloud vers le local
      console.log('[CloudSync] Début download depuis cloud...');

      // Download produits
      try {
        const cloudProducts = await this.cloudApi.get('/sync/data/products');
        if (cloudProducts.data.count > 0) {
          await this.localApi.post('/sync/upload', {
            entity_type: 'products',
            items: cloudProducts.data.data
          }, { headers });
          downloaded += cloudProducts.data.count;
          console.log(`[CloudSync] ${cloudProducts.data.count} produits téléchargés`);
        }
      } catch (e: any) {
        errors.push(`Download produits: ${e.message}`);
      }

      // Download clients
      try {
        const cloudCustomers = await this.cloudApi.get('/sync/data/customers');
        if (cloudCustomers.data.count > 0) {
          await this.localApi.post('/sync/upload', {
            entity_type: 'customers',
            items: cloudCustomers.data.data
          }, { headers });
          downloaded += cloudCustomers.data.count;
          console.log(`[CloudSync] ${cloudCustomers.data.count} clients téléchargés`);
        }
      } catch (e: any) {
        errors.push(`Download clients: ${e.message}`);
      }

      // Download ventes
      try {
        const cloudSales = await this.cloudApi.get('/sync/data/sales');
        if (cloudSales.data.count > 0) {
          await this.localApi.post('/sync/upload', {
            entity_type: 'sales',
            items: cloudSales.data.data
          }, { headers });
          downloaded += cloudSales.data.count;
          console.log(`[CloudSync] ${cloudSales.data.count} ventes téléchargées`);
        }
      } catch (e: any) {
        errors.push(`Download ventes: ${e.message}`);
      }

      console.log(`[CloudSync] Sync terminée: ${uploaded} uploadés, ${downloaded} téléchargés`);

      return {
        success: errors.length === 0,
        uploaded,
        downloaded,
        errors,
        timestamp: new Date().toISOString()
      };
    } catch (e: any) {
      console.error('[CloudSync] Erreur sync:', e);
      return {
        success: false,
        uploaded,
        downloaded,
        errors: [...errors, e.message],
        timestamp: new Date().toISOString()
      };
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Démarrer la synchronisation automatique
   */
  startAutoSync(): void {
    this.stopAutoSync();
    
    if (!this.config?.autoSync || !this.config.syncInterval) return;

    const intervalMs = this.config.syncInterval * 60 * 1000;
    console.log(`[CloudSync] Auto-sync activée (toutes les ${this.config.syncInterval} min)`);
    
    this.autoSyncTimer = window.setInterval(() => {
      if (navigator.onLine && this.isCloudConnected()) {
        console.log('[CloudSync] Auto-sync déclenchée');
        this.fullSync();
      }
    }, intervalMs);
  }

  /**
   * Arrêter la synchronisation automatique
   */
  stopAutoSync(): void {
    if (this.autoSyncTimer !== null) {
      window.clearInterval(this.autoSyncTimer);
      this.autoSyncTimer = null;
      console.log('[CloudSync] Auto-sync arrêtée');
    }
  }

  /**
   * Tester la connexion au serveur cloud
   */
  async testCloudConnection(url: string): Promise<{ success: boolean; message: string }> {
    try {
      const testApi = axios.create({
        baseURL: url.replace(/\/$/, ''),
        timeout: 10000,
      });
      
      // Tester l'endpoint /health à la racine
      await testApi.get('/health');
      return { success: true, message: 'Connexion réussie' };
    } catch (e: any) {
      return { 
        success: false, 
        message: e.response?.data?.detail || e.message || 'Impossible de contacter le serveur'
      };
    }
  }
}

// Instance singleton
export const cloudSyncService = new CloudSyncService();
