import { useEffect, useState, useCallback } from 'react';
import { syncService, SyncStatus } from '@/services/syncService';
import { useAppStore } from '@/stores/appStore';

export function useSync() {
  const { isOnline, pendingSyncCount } = useAppStore();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isSyncing: false,
    lastSyncAt: null,
    pendingCount: 0,
    error: null,
  });

  // Initialiser le service au montage
  useEffect(() => {
    syncService.init();
    
    // Mettre à jour le statut périodiquement
    const updateStatus = async () => {
      const status = await syncService.getSyncStatus();
      setSyncStatus(status);
    };

    updateStatus();
    const interval = setInterval(updateStatus, 5000);

    return () => {
      syncService.stopAutoSync();
      clearInterval(interval);
    };
  }, []);

  // Synchroniser manuellement
  const sync = useCallback(async () => {
    await syncService.fullSync();
    const status = await syncService.getSyncStatus();
    setSyncStatus(status);
  }, []);

  // Synchroniser les opérations en attente
  const syncPending = useCallback(async () => {
    await syncService.syncPendingOperations();
    const status = await syncService.getSyncStatus();
    setSyncStatus(status);
  }, []);

  return {
    isOnline,
    pendingSyncCount,
    syncStatus,
    sync,
    syncPending,
  };
}

