import localforage from 'localforage';

// Configuration de localforage pour le stockage offline
localforage.config({
  driver: [localforage.INDEXEDDB, localforage.LOCALSTORAGE],
  name: 'PharmacieManager',
  storeName: 'pharmacie_data',
  description: 'Données locales de Pharmacie Manager',
});

// Stores séparés pour chaque type de données
export const productsStore = localforage.createInstance({
  name: 'PharmacieManager',
  storeName: 'products',
});

export const salesStore = localforage.createInstance({
  name: 'PharmacieManager',
  storeName: 'sales',
});

export const customersStore = localforage.createInstance({
  name: 'PharmacieManager',
  storeName: 'customers',
});

export const cashStore = localforage.createInstance({
  name: 'PharmacieManager',
  storeName: 'cash',
});

export const pendingSyncStore = localforage.createInstance({
  name: 'PharmacieManager',
  storeName: 'pending_sync',
});

// Fonctions utilitaires
export async function saveToOffline<T>(store: LocalForage, key: string, data: T): Promise<T> {
  return await store.setItem(key, data);
}

export async function getFromOffline<T>(store: LocalForage, key: string): Promise<T | null> {
  return await store.getItem(key);
}

export async function removeFromOffline(store: LocalForage, key: string): Promise<void> {
  return await store.removeItem(key);
}

export async function clearOfflineStore(store: LocalForage): Promise<void> {
  return await store.clear();
}

// Queue pour les opérations à synchroniser
export interface PendingOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: 'sale' | 'product' | 'customer' | 'supplier' | 'order' | 'cash_session' | string;
  endpoint: string;
  method: 'POST' | 'PUT' | 'DELETE';
  data: unknown;
  timestamp: number;
  retries?: number;
}

export async function addToPendingSync(operation: Omit<PendingOperation, 'id' | 'timestamp' | 'retries'>): Promise<void> {
  const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const pendingOp: PendingOperation = {
    ...operation,
    id,
    timestamp: Date.now(),
    retries: 0,
  };
  
  await pendingSyncStore.setItem(id, pendingOp);
}

export async function getPendingOperations(): Promise<PendingOperation[]> {
  const operations: PendingOperation[] = [];
  
  await pendingSyncStore.iterate<PendingOperation, void>((value) => {
    operations.push(value);
  });
  
  return operations.sort((a, b) => a.timestamp - b.timestamp);
}

export async function removePendingOperation(id: string): Promise<void> {
  await pendingSyncStore.removeItem(id);
}

export async function getPendingSyncCount(): Promise<number> {
  return await pendingSyncStore.length();
}

