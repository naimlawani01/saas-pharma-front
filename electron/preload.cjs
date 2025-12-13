const { contextBridge, ipcRenderer } = require('electron');

// Exposer un indicateur que l'application tourne dans Electron
contextBridge.exposeInMainWorld('electron', true);

// Exposer des APIs sécurisées au renderer
contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  // Ajouter d'autres méthodes si nécessaire
});

