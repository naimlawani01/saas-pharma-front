/**
 * Configuration client pour l'application Pharmacie Manager
 * 
 * Ce fichier définit les paramètres de connexion au serveur cloud
 * et les options de synchronisation.
 */

export interface ClientConfig {
  // Identifiant unique de la pharmacie sur le serveur cloud
  pharmacyId: number | null;
  
  // URL du serveur cloud pour la synchronisation
  cloudServerUrl: string;
  
  // Mode de fonctionnement
  mode: 'local' | 'cloud' | 'hybrid';
  
  // Options de synchronisation
  syncOptions: {
    // Synchroniser automatiquement quand en ligne
    autoSync: boolean;
    // Intervalle de sync en minutes
    syncInterval: number;
    // Synchroniser au démarrage
    syncOnStartup: boolean;
  };
}

// Configuration par défaut
export const defaultConfig: ClientConfig = {
  pharmacyId: null,
  cloudServerUrl: '',
  mode: 'local',  // Par défaut, mode local uniquement
  syncOptions: {
    autoSync: true,
    syncInterval: 5,  // Toutes les 5 minutes
    syncOnStartup: true,
  },
};

// Charger la configuration depuis le localStorage
export function loadClientConfig(): ClientConfig {
  try {
    const stored = localStorage.getItem('pharmacie-client-config');
    if (stored) {
      return { ...defaultConfig, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error('Erreur chargement config:', e);
  }
  return defaultConfig;
}

// Sauvegarder la configuration
export function saveClientConfig(config: Partial<ClientConfig>): void {
  const current = loadClientConfig();
  const updated = { ...current, ...config };
  localStorage.setItem('pharmacie-client-config', JSON.stringify(updated));
}

// Vérifier si le mode cloud est configuré
export function isCloudConfigured(): boolean {
  const config = loadClientConfig();
  return config.mode !== 'local' && 
         config.cloudServerUrl !== '' && 
         config.pharmacyId !== null;
}

// Obtenir l'URL de l'API selon le mode
export function getApiUrl(): string {
  const config = loadClientConfig();
  const isElectron = typeof window !== 'undefined' && window.electron === true;
  
  if (isElectron && config.mode === 'local') {
    // Mode local : backend embarqué
    return 'http://localhost:8000/api/v1';
  }
  
  if (config.mode === 'cloud' || config.mode === 'hybrid') {
    // Mode cloud ou hybride : serveur distant
    return config.cloudServerUrl + '/api/v1';
  }
  
  // Fallback
  return 'http://localhost:8000/api/v1';
}

