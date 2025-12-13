/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  electron?: boolean | {
    // Indicateur que l'application tourne dans Electron
    [key: string]: any;
  };
  electronAPI?: {
    getAppVersion: () => Promise<string>;
    getPlatform: () => Promise<string>;
  };
  electronDB?: {
    // Base de données SQLite via IPC
    [key: string]: any;
  };
}

