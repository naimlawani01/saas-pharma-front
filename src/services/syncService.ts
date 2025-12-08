import { api } from './api';
import { 
  pendingSyncStore, 
  productsStore, 
  salesStore, 
  customersStore,
  cashStore,
  addToPendingSync,
  getPendingOperations,
  removePendingOperation,
  saveToOffline,
} from './offlineStorage';
import { useAppStore } from '@/stores/appStore';
import toast from 'react-hot-toast';

export interface PendingOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: 'sale' | 'product' | 'customer' | 'supplier' | 'order' | 'cash_session';
  endpoint: string;
  method: 'POST' | 'PUT' | 'DELETE';
  data: any;
  timestamp: number;
  retries: number;
}

export interface SyncStatus {
  isSyncing: boolean;
  lastSyncAt: Date | null;
  pendingCount: number;
  error: string | null;
}

class SyncService {
  private syncInterval: NodeJS.Timeout | null = null;
  private isSyncing = false;
  private maxRetries = 3;

  /**
   * Initialise le service de synchronisation
   */
  init() {
    // Vérifier la connexion au démarrage
    this.checkConnection();
    
    // Écouter les changements de connexion
    window.addEventListener('online', () => {
      useAppStore.getState().setOnlineStatus(true);
      this.syncPendingOperations();
    });
    
    window.addEventListener('offline', () => {
      useAppStore.getState().setOnlineStatus(false);
    });

    // Synchronisation automatique toutes les 30 secondes si online
    this.startAutoSync();
    
    // Synchroniser immédiatement si online
    if (navigator.onLine) {
      setTimeout(() => this.syncPendingOperations(), 2000);
    }
  }

  /**
   * Vérifie la connexion internet
   */
  private checkConnection(): boolean {
    const isOnline = navigator.onLine;
    useAppStore.getState().setOnlineStatus(isOnline);
    return isOnline;
  }

  /**
   * Démarre la synchronisation automatique
   */
  startAutoSync(intervalMs: number = 30000) {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    this.syncInterval = setInterval(() => {
      if (navigator.onLine && !this.isSyncing) {
        this.syncPendingOperations();
      }
    }, intervalMs);
  }

  /**
   * Arrête la synchronisation automatique
   */
  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Sauvegarde une opération en attente de synchronisation
   */
  async savePendingOperation(
    type: PendingOperation['type'],
    entity: PendingOperation['entity'],
    endpoint: string,
    method: PendingOperation['method'],
    data: any
  ): Promise<void> {
    const operation: Omit<PendingOperation, 'id' | 'timestamp' | 'retries'> = {
      type,
      entity,
      endpoint,
      method,
      data,
    };

    await addToPendingSync(operation);
    await this.updatePendingCount();
    
    // Si offline, sauvegarder aussi les données localement
    if (!navigator.onLine) {
      await this.saveOfflineData(entity, data);
    }
  }

  /**
   * Sauvegarde les données localement pour consultation offline
   */
  private async saveOfflineData(entity: string, data: any): Promise<void> {
    try {
      let store;
      let key: string;

      switch (entity) {
        case 'sale':
          store = salesStore;
          key = data.sale_number || data.id?.toString() || `temp-${Date.now()}`;
          break;
        case 'product':
          store = productsStore;
          key = data.id?.toString() || data.barcode || `temp-${Date.now()}`;
          break;
        case 'customer':
          store = customersStore;
          key = data.id?.toString() || `temp-${Date.now()}`;
          break;
        case 'cash_session':
          store = cashStore;
          key = 'pending_session';
          break;
        default:
          return;
      }

      if (store && key) {
        await saveToOffline(store, key, { ...data, _offline: true, _timestamp: Date.now() });
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde offline:', error);
    }
  }

  /**
   * Synchronise toutes les opérations en attente
   */
  async syncPendingOperations(): Promise<void> {
    if (!navigator.onLine || this.isSyncing) {
      return;
    }

    this.isSyncing = true;
    const operations = await getPendingOperations();

    if (operations.length === 0) {
      this.isSyncing = false;
      await this.updatePendingCount();
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const operation of operations) {
      try {
        const success = await this.syncOperation(operation as PendingOperation);
        if (success) {
          await removePendingOperation(operation.id);
          successCount++;
        } else {
          // Incrémenter le compteur de retries
          const updatedOp = { ...operation, retries: (operation.retries || 0) + 1 };
          await pendingSyncStore.setItem(operation.id, updatedOp);
          
          errorCount++;
          // Si trop d'échecs, retirer de la queue
          if (updatedOp.retries >= this.maxRetries) {
            console.error(`Opération ${operation.id} a échoué ${updatedOp.retries} fois, retirée de la queue`);
            await removePendingOperation(operation.id);
          }
        }
      } catch (error: any) {
        console.error('Erreur lors de la synchronisation:', error);
        errorCount++;
      }
    }

    await this.updatePendingCount();

    if (successCount > 0 && operations.length > 1) {
      toast.success(`${successCount} opération(s) synchronisée(s)`, { duration: 2000 });
    }

    if (errorCount > 0 && successCount === 0 && operations.length > 1) {
      toast.error(`${errorCount} opération(s) en échec`, { duration: 3000 });
    }

    this.isSyncing = false;
  }

  /**
   * Synchronise une opération spécifique
   */
  private async syncOperation(operation: PendingOperation): Promise<boolean> {
    try {
      let response;

      switch (operation.method) {
        case 'POST':
          response = await api.post(operation.endpoint, operation.data);
          break;
        case 'PUT':
          response = await api.put(operation.endpoint, operation.data);
          break;
        case 'DELETE':
          response = await api.delete(operation.endpoint);
          break;
        default:
          return false;
      }
      
      return response.status >= 200 && response.status < 300;
    } catch (error: any) {
      // Si erreur réseau, garder l'opération en attente
      if (!error.response) {
        return false;
      }
      
      // Si erreur serveur (4xx, 5xx), retirer de la queue après max retries
      if ((operation.retries || 0) >= this.maxRetries) {
        console.error(`Opération ${operation.id} définitivement échouée:`, error.response?.data);
        return true; // Retirer de la queue même en cas d'échec
      }
      
      return false;
    }
  }

  /**
   * Met à jour le compteur d'opérations en attente
   */
  private async updatePendingCount(): Promise<void> {
    const count = await getPendingOperations().then(ops => ops.length);
    useAppStore.getState().setPendingSyncCount(count);
  }

  /**
   * Télécharge les données depuis le serveur
   */
  async downloadData(entity: 'products' | 'sales' | 'customers', lastSyncAt?: Date): Promise<void> {
    if (!navigator.onLine) {
      return;
    }

    try {
      const params = lastSyncAt ? { last_sync_at: lastSyncAt.toISOString() } : {};
      const response = await api.get(`/sync/data/${entity}`, { params });

      const { data } = response.data;

      // Sauvegarder localement
      let store;
      switch (entity) {
        case 'products':
          store = productsStore;
          break;
        case 'sales':
          store = salesStore;
          break;
        case 'customers':
          store = customersStore;
          break;
      }

      if (store) {
        for (const item of data) {
          const key = item.id?.toString() || item.sync_id || `item-${Date.now()}`;
          await saveToOffline(store, key, { ...item, _synced: true });
        }
      }
    } catch (error) {
      console.error(`Erreur lors du téléchargement de ${entity}:`, error);
    }
  }

  /**
   * Synchronisation complète bidirectionnelle
   */
  async fullSync(): Promise<void> {
    if (!navigator.onLine) {
      toast.error('Pas de connexion internet');
      return;
    }

    this.isSyncing = true;
    toast.loading('Synchronisation en cours...', { id: 'sync' });

    try {
      // 1. Synchroniser les opérations en attente
      await this.syncPendingOperations();

      // 2. Télécharger les données mises à jour
      const lastSyncAt = await this.getLastSyncDate();
      await Promise.all([
        this.downloadData('products', lastSyncAt),
        this.downloadData('sales', lastSyncAt),
        this.downloadData('customers', lastSyncAt),
      ]);

      // 3. Mettre à jour la date de dernière sync
      await this.setLastSyncDate(new Date());

      toast.success('Synchronisation terminée', { id: 'sync' });
    } catch (error: any) {
      toast.error('Erreur lors de la synchronisation', { id: 'sync' });
      console.error('Erreur de synchronisation:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Récupère la date de dernière synchronisation
   */
  private async getLastSyncDate(): Promise<Date | undefined> {
    const lastSync = localStorage.getItem('lastSyncAt');
    return lastSync ? new Date(lastSync) : undefined;
  }

  /**
   * Enregistre la date de dernière synchronisation
   */
  private async setLastSyncDate(date: Date): Promise<void> {
    localStorage.setItem('lastSyncAt', date.toISOString());
  }

  /**
   * Obtient le statut de synchronisation
   */
  async getSyncStatus(): Promise<SyncStatus> {
    const operations = await getPendingOperations();
    const lastSync = await this.getLastSyncDate();

    return {
      isSyncing: this.isSyncing,
      lastSyncAt: lastSync || null,
      pendingCount: operations.length,
      error: null,
    };
  }

  /**
   * Nettoie les anciennes opérations (plus de 7 jours)
   */
  async cleanupOldOperations(): Promise<void> {
    const operations = await getPendingOperations();
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    for (const operation of operations) {
      if (operation.timestamp < sevenDaysAgo) {
        await removePendingOperation(operation.id);
      }
    }

    await this.updatePendingCount();
  }
}

// Instance singleton
export const syncService = new SyncService();

