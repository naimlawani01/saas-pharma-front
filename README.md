# Pharmacie Manager - Frontend

Application de gestion de pharmacie desktop avec React + Electron.

## 🚀 Fonctionnalités

- **Tableau de bord** - Vue d'ensemble des statistiques et alertes
- **Gestion des produits** - Inventaire, stock, expiration
- **Ventes** - Point de vente avec recherche rapide
- **Clients** - Base de données clients avec historique
- **Fournisseurs** - Gestion des fournisseurs et commandes
- **Rapports** - Statistiques et graphiques
- **Mode hors-ligne** - Fonctionne sans Internet avec synchronisation

## 📋 Prérequis

- Node.js 18+
- npm ou yarn

## 🛠️ Installation

```bash
# Installer les dépendances
npm install

# Copier le fichier d'environnement
cp .env.example .env
```

## 💻 Développement

```bash
# Lancer en mode développement (navigateur uniquement)
npm run dev

# Lancer avec Electron
npm run electron:dev
```

## 📦 Build

```bash
# Build pour production
npm run build

# Build application Electron
npm run electron:build
```

## 🏗️ Structure du projet

```
frontend/
├── electron/           # Configuration Electron
│   ├── main.js        # Process principal
│   └── preload.js     # Scripts preload
├── public/            # Assets statiques
├── src/
│   ├── components/    # Composants réutilisables
│   ├── layouts/       # Layouts (Auth, Dashboard)
│   ├── pages/         # Pages de l'application
│   │   ├── auth/      # Pages d'authentification
│   │   └── dashboard/ # Pages du tableau de bord
│   ├── services/      # Services API et storage
│   ├── stores/        # State management (Zustand)
│   ├── App.tsx        # Composant racine
│   ├── main.tsx       # Point d'entrée
│   └── index.css      # Styles globaux
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

## 🔧 Technologies utilisées

- **React 18** - UI Framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Electron** - Desktop app
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **React Query** - Data fetching
- **React Router** - Navigation
- **Recharts** - Graphiques
- **LocalForage** - Stockage local offline

## 🎨 Design

- Interface moderne et intuitive
- Thème vert pharmacie
- Responsive design
- Mode sombre (à venir)

## 🔐 Authentification

L'application utilise JWT pour l'authentification avec refresh token automatique.

### Comptes de démo
- **Admin**: admin / admin123
- **Pharmacien**: pharmacist / pharmacist123

## 📱 Mode Offline

L'application stocke les données localement avec IndexedDB et synchronise automatiquement quand la connexion est rétablie.

## 📄 Licence

MIT

