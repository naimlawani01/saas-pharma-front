const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

// Désactiver l'accélération matérielle si problèmes
// app.disableHardwareAcceleration();

let mainWindow;
let backendProcess = null;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// Port du backend FastAPI local
const BACKEND_PORT = 8000;
const BACKEND_URL = `http://localhost:${BACKEND_PORT}`;

// Chemins vers le backend
function getBackendPath() {
  if (isDev) {
    // En développement, utiliser le dossier backend à la racine du projet
    return path.join(__dirname, '..', '..', 'backend');
  } else {
    // En production, le backend packagé est dans les ressources
    return path.join(process.resourcesPath, 'backend', 'pharmacie-backend');
  }
}

function getBackendExecutable() {
  if (isDev) {
    // En dev, on utilise Python + uvicorn
    return null;
  } else {
    // En production, utiliser l'exécutable packagé
    const platform = process.platform;
    const backendDir = path.join(process.resourcesPath, 'backend', 'pharmacie-backend');
    
    if (platform === 'win32') {
      return path.join(backendDir, 'pharmacie-backend.exe');
    } else {
      return path.join(backendDir, 'pharmacie-backend');
    }
  }
}

function getPythonPath() {
  // En dev, utiliser le Python du système ou du venv
  const platform = process.platform;
  const backendPath = path.join(__dirname, '..', '..', 'backend');
  const projectRoot = path.join(__dirname, '..', '..');
  
  if (platform === 'win32') {
    const venvBackend = path.join(backendPath, '.venv', 'Scripts', 'python.exe');
    const venvRoot = path.join(projectRoot, '.venv', 'Scripts', 'python.exe');
    
    if (fs.existsSync(venvBackend)) return venvBackend;
    if (fs.existsSync(venvRoot)) return venvRoot;
    return 'python';
  } else {
    const venvBackend = path.join(backendPath, '.venv', 'bin', 'python');
    const venvRoot = path.join(projectRoot, '.venv', 'bin', 'python');
    
    if (fs.existsSync(venvBackend)) return venvBackend;
    if (fs.existsSync(venvRoot)) return venvRoot;
    return 'python3';
  }
}

// Vérifier si le backend est déjà en cours d'exécution
function checkBackendRunning() {
  return new Promise((resolve) => {
    const req = http.get(`${BACKEND_URL}/health`, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

// Attendre que le backend soit prêt
function waitForBackend(maxAttempts = 30, interval = 1000) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    
    const check = async () => {
      attempts++;
      console.log(`[Backend] Vérification ${attempts}/${maxAttempts}...`);
      
      const isRunning = await checkBackendRunning();
      if (isRunning) {
        console.log('[Backend] ✅ Serveur prêt!');
        resolve(true);
        return;
      }
      
      if (attempts >= maxAttempts) {
        reject(new Error('Backend failed to start within timeout'));
        return;
      }
      
      setTimeout(check, interval);
    };
    
    check();
  });
}

// Démarrer le backend FastAPI
async function startBackend() {
  // Vérifier si déjà en cours
  const alreadyRunning = await checkBackendRunning();
  if (alreadyRunning) {
    console.log('[Backend] Serveur déjà en cours d\'exécution');
    return true;
  }
  
  console.log('[Backend] Démarrage du serveur FastAPI...');
  console.log('[Backend] Mode:', isDev ? 'DÉVELOPPEMENT' : 'PRODUCTION');
  
  if (isDev) {
    // En développement : utiliser Python + uvicorn
    return startBackendDev();
  } else {
    // En production : utiliser l'exécutable packagé
    return startBackendProd();
  }
}

// Démarrage en mode développement (Python + uvicorn)
function startBackendDev() {
  const backendPath = path.join(__dirname, '..', '..', 'backend');
  const pythonPath = getPythonPath();
  
  console.log('[Backend] Python path:', pythonPath);
  console.log('[Backend] Backend path:', backendPath);
  
  const args = [
    '-m', 'uvicorn',
    'app.main:app',
    '--host', '127.0.0.1',
    '--port', String(BACKEND_PORT),
    '--reload',
  ];
  
  const dataDir = path.join(backendPath, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  const env = {
    ...process.env,
    PYTHONUNBUFFERED: '1',
    DATABASE_URL: `sqlite:///${path.join(backendPath, 'data', 'pharmacie.db')}`,
    SECRET_KEY: 'local-electron-secret-key-change-in-production',
    ENVIRONMENT: 'development',
    DEBUG: 'true',
  };
  
  console.log('[Backend] Commande:', pythonPath, args.join(' '));
  
  backendProcess = spawn(pythonPath, args, {
    cwd: backendPath,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
  });
  
  setupBackendListeners();
  return true;
}

// Démarrage en mode production (exécutable packagé)
function startBackendProd() {
  const executablePath = getBackendExecutable();
  const backendDir = path.dirname(executablePath);
  
  console.log('[Backend] Exécutable:', executablePath);
  console.log('[Backend] Dossier:', backendDir);
  
  // Vérifier que l'exécutable existe
  if (!fs.existsSync(executablePath)) {
    console.error('[Backend] ❌ Exécutable non trouvé:', executablePath);
    return false;
  }
  
  // Créer le dossier data s'il n'existe pas
  const dataDir = path.join(backendDir, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('[Backend] Dossier data créé:', dataDir);
  }
  
  // Variables d'environnement
  const env = {
    ...process.env,
    DATABASE_URL: `sqlite:///${path.join(dataDir, 'pharmacie.db')}`,
    SECRET_KEY: 'local-electron-secret-key-change-in-production',
    ENVIRONMENT: 'production',
    DEBUG: 'false',
  };
  
  console.log('[Backend] Lancement de l\'exécutable...');
  
  backendProcess = spawn(executablePath, [], {
    cwd: backendDir,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  
  setupBackendListeners();
  return true;
}

// Configuration des listeners pour le processus backend
function setupBackendListeners() {
  if (!backendProcess) return;
  
  backendProcess.stdout.on('data', (data) => {
    console.log('[Backend]', data.toString().trim());
  });
  
  backendProcess.stderr.on('data', (data) => {
    // uvicorn écrit ses logs sur stderr, ce n'est pas forcément une erreur
    const msg = data.toString().trim();
    if (msg.includes('ERROR') || msg.includes('error')) {
      console.error('[Backend Error]', msg);
    } else {
      console.log('[Backend]', msg);
    }
  });
  
  backendProcess.on('error', (error) => {
    console.error('[Backend] Erreur de démarrage:', error.message);
  });
  
  backendProcess.on('close', (code) => {
    console.log(`[Backend] Processus terminé avec code ${code}`);
    backendProcess = null;
  });
}

// Arrêter le backend
function stopBackend() {
  if (backendProcess) {
    console.log('[Backend] Arrêt du serveur...');
    
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', backendProcess.pid, '/f', '/t']);
    } else {
      backendProcess.kill('SIGTERM');
      
      setTimeout(() => {
        if (backendProcess && !backendProcess.killed) {
          backendProcess.kill('SIGKILL');
        }
      }, 3000);
    }
    
    backendProcess = null;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
      contentSecurityPolicy: isDev
        ? "default-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:* ws://localhost:* data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:*; style-src 'self' 'unsafe-inline';"
        : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' http://localhost:8000;",
    },
    icon: path.join(__dirname, '../public/favicon.svg'),
    titleBarStyle: 'default',
    show: false,
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Quand Electron est prêt
app.whenReady().then(async () => {
  console.log('[App] Démarrage de Pharmacie Manager...');
  console.log('[App] Mode:', isDev ? 'DÉVELOPPEMENT' : 'PRODUCTION');
  console.log('[App] Resources path:', process.resourcesPath);
  
  const backendStarted = await startBackend();
  
  if (backendStarted) {
    try {
      await waitForBackend(30, 1000);
    } catch (error) {
      console.error('[App] ⚠️ Le backend n\'a pas démarré à temps:', error.message);
    }
  }
  
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    stopBackend();
    app.quit();
  }
});

app.on('before-quit', () => {
  stopBackend();
});

app.on('will-quit', () => {
  stopBackend();
});

// IPC handlers
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('get-platform', () => {
  return process.platform;
});

ipcMain.handle('get-backend-status', async () => {
  const isRunning = await checkBackendRunning();
  return {
    running: isRunning,
    url: BACKEND_URL,
    port: BACKEND_PORT,
  };
});

ipcMain.handle('restart-backend', async () => {
  stopBackend();
  await new Promise(resolve => setTimeout(resolve, 1000));
  const started = await startBackend();
  if (started) {
    try {
      await waitForBackend(15, 1000);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  return { success: false, error: 'Failed to start backend' };
});
