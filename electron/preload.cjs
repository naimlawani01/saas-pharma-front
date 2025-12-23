const { contextBridge, ipcRenderer } = require('electron');

// Exposer un indicateur que l'application tourne dans Electron
contextBridge.exposeInMainWorld('electron', true);

// Exposer des APIs sécurisées au renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Infos sur l'app
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  
  // Gestion du backend local
  getBackendStatus: () => ipcRenderer.invoke('get-backend-status'),
  restartBackend: () => ipcRenderer.invoke('restart-backend'),
  
  // Event listeners pour le statut du backend
  onBackendStatusChange: (callback) => {
    const handler = (_event, status) => callback(status);
    ipcRenderer.on('backend-status-change', handler);
    return () => ipcRenderer.removeListener('backend-status-change', handler);
  },

  // Informations système pour les licences (via IPC vers main process)
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),

  // Générer un Hardware ID unique (via IPC vers main process)
  getHardwareId: () => ipcRenderer.invoke('get-hardware-id'),
});
