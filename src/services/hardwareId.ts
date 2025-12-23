/**
 * Service pour générer un identifiant unique de machine (Hardware ID)
 * Utilisé pour l'activation et la vérification des licences.
 */

// Type pour l'API Electron (fonctions asynchrones via IPC)
interface ElectronAPI {
  getHardwareId: () => Promise<string>;
  getSystemInfo: () => Promise<{
    hostname: string;
    platform: string;
    arch: string;
    type: string;
    release: string;
    totalmem: number;
    homedir: string;
    cpus: string;
    cpuCount: number;
  }>;
}

declare global {
  interface Window {
    electron?: boolean;
    electronAPI?: ElectronAPI;
  }
}

/**
 * Vérifie si on est dans Electron
 */
function isElectron(): boolean {
  return typeof window !== 'undefined' && window.electron === true;
}

/**
 * Génère un identifiant unique basé sur les caractéristiques matérielles de la machine.
 * Combine plusieurs identifiants système pour créer un hash unique.
 */
export async function generateHardwareId(): Promise<string> {
  try {
    // Vérifier si on est dans Electron
    if (!isElectron()) {
      // En mode web, utiliser localStorage avec un identifiant généré
      let hwId = localStorage.getItem('fanke_hardware_id');
      if (!hwId) {
        hwId = `web-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
        localStorage.setItem('fanke_hardware_id', hwId);
      }
      return hwId;
    }
    
    // Dans Electron, utiliser l'API exposée par le preload script (via IPC)
    if (window.electronAPI?.getHardwareId) {
      const hwId = await window.electronAPI.getHardwareId();
      // Stocker dans localStorage pour réutilisation
      localStorage.setItem('fanke_hardware_id', hwId);
      return hwId;
    }
    
    // Fallback si l'API n'est pas disponible
    throw new Error('electronAPI.getHardwareId non disponible');
  } catch (error) {
    console.error('Erreur lors de la génération du Hardware ID:', error);
    // Fallback: utiliser localStorage
    let hwId = localStorage.getItem('fanke_hardware_id');
    if (!hwId) {
      hwId = `fallback-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
      localStorage.setItem('fanke_hardware_id', hwId);
    }
    return hwId;
  }
}

/**
 * Obtient les informations système pour l'affichage (nom de machine, OS, etc.)
 */
export async function getSystemInfo(): Promise<{
  machineName: string;
  osInfo: string;
  platform: string;
  arch: string;
}> {
  try {
    // Vérifier si on est dans Electron
    if (!isElectron()) {
      return {
        machineName: navigator.userAgent.substring(0, 50),
        osInfo: 'Web Browser',
        platform: 'web',
        arch: 'unknown',
      };
    }
    
    // Dans Electron, utiliser l'API exposée par le preload script (via IPC)
    if (window.electronAPI?.getSystemInfo) {
      const info = await window.electronAPI.getSystemInfo();
      return {
        machineName: info.hostname,
        osInfo: `${info.type} ${info.release}`,
        platform: info.platform,
        arch: info.arch,
      };
    }
    
    // Fallback
    return {
      machineName: 'Electron App',
      osInfo: 'Unknown',
      platform: 'electron',
      arch: 'unknown',
    };
  } catch (error) {
    console.error('Erreur lors de la récupération des informations système:', error);
    return {
      machineName: 'Unknown',
      osInfo: 'Unknown',
      platform: 'unknown',
      arch: 'unknown',
    };
  }
}
