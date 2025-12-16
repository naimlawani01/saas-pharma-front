/**
 * Script de packaging du backend Python pour Electron
 * 
 * Ce script prépare le backend FastAPI pour être inclus dans le package Electron :
 * 1. Télécharge Python portable pour la plateforme cible
 * 2. Installe les dépendances dans un environnement isolé
 * 3. Crée le dossier data pour SQLite
 * 
 * Usage: node scripts/package-backend.js
 */

import { execSync, spawn } from 'child_process';
import { existsSync, mkdirSync, copyFileSync, writeFileSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import { createWriteStream } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ROOT_DIR = join(__dirname, '..');
const BACKEND_DIR = join(ROOT_DIR, '..', 'backend');
const PYTHON_EMBEDDED_DIR = join(ROOT_DIR, 'python-embedded');

// URLs pour Python embedded (portable)
const PYTHON_URLS = {
  win32: {
    x64: 'https://www.python.org/ftp/python/3.11.7/python-3.11.7-embed-amd64.zip',
  },
  darwin: {
    // macOS utilise le Python du système ou un Python installé via Homebrew
    // On crée un venv à la place
  },
  linux: {
    x64: 'https://github.com/indygreg/python-build-standalone/releases/download/20231002/cpython-3.11.6+20231002-x86_64-unknown-linux-gnu-install_only.tar.gz',
  },
};

async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    console.log(`Téléchargement de ${url}...`);
    const file = createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Suivre les redirections
        https.get(response.headers.location, (redirectResponse) => {
          redirectResponse.pipe(file);
          file.on('finish', () => {
            file.close();
            resolve();
          });
        }).on('error', reject);
      } else {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      }
    }).on('error', reject);
  });
}

async function setupPythonForPlatform(platform) {
  const platformDir = join(PYTHON_EMBEDDED_DIR, platform);
  
  if (!existsSync(platformDir)) {
    mkdirSync(platformDir, { recursive: true });
  }
  
  if (platform === 'darwin') {
    // Sur macOS, utiliser le Python du système et créer un venv
    console.log('macOS: Création d\'un environnement virtuel...');
    
    const venvPath = join(platformDir, 'venv');
    if (!existsSync(venvPath)) {
      execSync(`python3 -m venv ${venvPath}`, { stdio: 'inherit' });
    }
    
    // Installer les dépendances
    const pipPath = join(venvPath, 'bin', 'pip');
    const requirementsPath = join(BACKEND_DIR, 'requirements.txt');
    console.log('Installation des dépendances Python...');
    execSync(`${pipPath} install -r ${requirementsPath}`, { stdio: 'inherit' });
    
    // Créer un lien symbolique vers python3
    const pythonLink = join(platformDir, 'bin');
    if (!existsSync(pythonLink)) {
      mkdirSync(pythonLink, { recursive: true });
    }
    
    return venvPath;
  }
  
  // Pour Windows et Linux, télécharger Python embedded
  const archUrls = PYTHON_URLS[platform];
  if (!archUrls) {
    console.warn(`Pas de Python embedded disponible pour ${platform}`);
    return null;
  }
  
  // TODO: Implémenter le téléchargement et l'extraction pour Windows/Linux
  console.log(`Configuration Python pour ${platform} - À implémenter pour la production`);
  return platformDir;
}

async function prepareBackendData() {
  // Créer le dossier data pour SQLite
  const dataDir = join(BACKEND_DIR, 'data');
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
    console.log('Dossier data créé');
  }
  
  // Créer un fichier .env pour le mode Electron si non existant
  const envElectronPath = join(BACKEND_DIR, '.env.electron');
  const envContent = `# Configuration pour le mode Electron (local/offline)
DATABASE_URL=sqlite:///./data/pharmacie.db
SECRET_KEY=local-electron-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
API_V1_STR=/api/v1
PROJECT_NAME=Pharmacie Manager
PROJECT_VERSION=1.0.0
DEBUG=false
ENVIRONMENT=production
BACKEND_CORS_ORIGINS=http://localhost:5173,http://localhost:8000,file://
`;
  
  // Ne pas écraser un .env.electron existant
  if (!existsSync(envElectronPath)) {
    writeFileSync(envElectronPath, envContent);
    console.log('Fichier .env.electron créé');
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('📦 Packaging du backend Python pour Electron');
  console.log('='.repeat(60));
  
  const currentPlatform = process.platform;
  console.log(`Plateforme détectée: ${currentPlatform}`);
  
  // Créer le dossier python-embedded
  if (!existsSync(PYTHON_EMBEDDED_DIR)) {
    mkdirSync(PYTHON_EMBEDDED_DIR, { recursive: true });
  }
  
  // Préparer les données du backend
  await prepareBackendData();
  
  // Configurer Python pour la plateforme actuelle
  // Note: Pour un build cross-platform, il faudrait builder sur chaque plateforme
  console.log(`\nConfiguration de Python pour ${currentPlatform}...`);
  await setupPythonForPlatform(currentPlatform);
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Packaging terminé!');
  console.log('='.repeat(60));
  console.log(`
📋 Prochaines étapes pour la production:

1. Pour macOS: Le venv a été créé dans python-embedded/darwin/
   
2. Pour Windows: 
   - Télécharger Python embedded depuis python.org
   - Extraire dans python-embedded/win/
   - Installer pip: python.exe get-pip.py
   - Installer deps: python.exe -m pip install -r requirements.txt
   
3. Pour Linux:
   - Télécharger Python standalone
   - Extraire dans python-embedded/linux/
   - Installer les dépendances

Note: Le backend sera automatiquement copié dans les ressources
de l'application lors du build Electron.
`);
}

main().catch(console.error);

