/**
 * Configuration de l'application GestStock Pro
 * 
 * Application de gestion de stock multi-secteurs
 * Ces valeurs peuvent être modifiées avant le build pour personnaliser l'app
 */

export const appConfig = {
  /**
   * URL du serveur cloud pour l'inscription et la synchronisation
   * IMPORTANT: Modifier cette valeur pour pointer vers votre serveur de production
   */
  CLOUD_SERVER_URL: import.meta.env.VITE_CLOUD_SERVER_URL || 'https://saas-pharma-production.up.railway.app',
  
  /**
   * Nom de l'application
   */
  APP_NAME: 'GestStock Pro',
  
  /**
   * Sous-titre / Description courte
   */
  APP_TAGLINE: 'Gestion de stock simplifiée',
  
  /**
   * Version de l'application
   */
  APP_VERSION: '2.0.0',
  
  /**
   * Mode debug
   */
  DEBUG: import.meta.env.VITE_DEBUG === 'true' || import.meta.env.DEV,
};

// Validation au démarrage
if (!appConfig.CLOUD_SERVER_URL) {
  console.error('[Config] CLOUD_SERVER_URL n\'est pas défini !');
}

export default appConfig;

