import toast from 'react-hot-toast';

/**
 * Gère les erreurs offline dans les mutations
 * Affiche un message approprié si l'opération a été sauvegardée pour sync ultérieure
 */
export function handleOfflineError(error: any, successMessage?: string): void {
  if (error?.isOffline) {
    toast.success(
      successMessage || 'Opération enregistrée localement. Synchronisation automatique à la reconnexion.',
      { duration: 4000 }
    );
  } else if (!error.response && !navigator.onLine) {
    toast.error('Pas de connexion internet. L\'opération sera synchronisée automatiquement.');
  } else {
    // Erreur normale, laisser le gestionnaire d'erreur par défaut
    throw error;
  }
}

/**
 * Vérifie si une erreur est due à un problème offline
 */
export function isOfflineError(error: any): boolean {
  return error?.isOffline || (!error.response && !navigator.onLine);
}

