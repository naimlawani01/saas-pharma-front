/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface BackendStatus {
  running: boolean;
  url: string;
  port: number;
}

interface RestartBackendResult {
  success: boolean;
  error?: string;
}

interface SystemInfo {
  hostname: string;
  platform: string;
  arch: string;
  type: string;
  release: string;
  totalmem: number;
  homedir: string;
  cpus: string;
  cpuCount: number;
}

interface Window {
  electron?: boolean;
  electronAPI?: {
    // Infos sur l'app
    getAppVersion: () => Promise<string>;
    getPlatform: () => Promise<string>;
    
    // Gestion du backend local
    getBackendStatus: () => Promise<BackendStatus>;
    restartBackend: () => Promise<RestartBackendResult>;
    
    // Event listeners
    onBackendStatusChange: (callback: (status: BackendStatus) => void) => () => void;
    
    // Informations système pour les licences
    getSystemInfo: () => Promise<SystemInfo>;
    getHardwareId: () => Promise<string>;
  };
  electronDB?: {
    // Base de données SQLite via IPC
    [key: string]: any;
  };
}
