/**
 * Service pour générer un identifiant unique de machine (Hardware ID)
 * Utilisé pour l'activation et la vérification des licences.
 */

/**
 * Génère un identifiant unique basé sur les caractéristiques matérielles de la machine.
 * Combine plusieurs identifiants système pour créer un hash unique.
 */
export async function generateHardwareId(): Promise<string> {
  try {
    // Vérifier si on est dans Electron
    const isElectron = typeof window !== 'undefined' && (window as any).electron === true;
    
    if (!isElectron) {
      // En mode web, utiliser localStorage avec un identifiant généré
      let hwId = localStorage.getItem('fanke_hardware_id');
      if (!hwId) {
        hwId = `web-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
        localStorage.setItem('fanke_hardware_id', hwId);
      }
      return hwId;
    }
    
    // Dans Electron, utiliser le module os via dynamic import
    // Note: Dans Electron, le module 'os' est disponible dans le renderer
    const os = require('os');
    
    // Collecter les identifiants uniques
    const identifiers: string[] = [];
    
    // 1. Hostname (nom de la machine)
    identifiers.push(os.hostname());
    
    // 2. Plateforme et architecture
    identifiers.push(os.platform());
    identifiers.push(os.arch());
    
    // 3. Informations réseau (première interface réseau)
    const networkInterfaces = os.networkInterfaces();
    const firstInterface = Object.values(networkInterfaces)
      .flat()
      .find((iface: any) => iface && !iface.internal && iface.mac !== '00:00:00:00:00:00');
    if (firstInterface?.mac) {
      identifiers.push(firstInterface.mac);
    }
    
    // 4. CPU (modèle et nombre de cœurs)
    const cpus = os.cpus();
    if (cpus.length > 0) {
      identifiers.push(cpus[0].model);
      identifiers.push(cpus.length.toString());
    }
    
    // 5. Mémoire totale
    identifiers.push(os.totalmem().toString());
    
    // 6. Home directory (chemin utilisateur)
    identifiers.push(os.homedir());
    
    // Combiner tous les identifiants et créer un hash
    const combined = identifiers.join('|');
    
    // Créer un hash SHA-256 (simple hash pour Electron)
    const hash = await simpleHash(combined);
    
    // Stocker dans localStorage pour réutilisation
    localStorage.setItem('fanke_hardware_id', hash);
    
    return hash;
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
 * Hash simple utilisant une fonction de hashage basique.
 * En production, on pourrait utiliser crypto.subtle mais pour simplifier,
 * on utilise une fonction de hashage simple.
 */
async function simpleHash(str: string): Promise<string> {
  // Utiliser une fonction de hashage simple
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convertir en 32 bits
  }
  
  // Convertir en hexadécimal et ajouter un préfixe
  const hexHash = Math.abs(hash).toString(16).padStart(8, '0');
  
  // Ajouter un timestamp pour plus d'unicité (optionnel)
  const timestamp = Date.now().toString(16).slice(-8);
  
  return `hw-${hexHash}-${timestamp}`;
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
    const isElectron = typeof window !== 'undefined' && (window as any).electron === true;
    
    if (!isElectron) {
      return {
        machineName: navigator.userAgent,
        osInfo: 'Web Browser',
        platform: 'web',
        arch: 'unknown',
      };
    }
    
    // Dans Electron, utiliser le module os
    const os = require('os');
    
    return {
      machineName: os.hostname(),
      osInfo: `${os.type()} ${os.release()}`,
      platform: os.platform(),
      arch: os.arch(),
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

