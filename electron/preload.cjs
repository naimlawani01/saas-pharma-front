const { contextBridge, ipcRenderer } = require('electron');

// Exposer des APIs sécurisées au renderer
contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  // Ajouter d'autres méthodes si nécessaire
});

