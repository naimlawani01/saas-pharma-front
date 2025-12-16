# 🚀 Build Automatique avec GitHub Actions

Ce workflow build automatiquement l'application Electron pour **macOS**, **Windows** et **Linux** à chaque tag de version.

> ⚠️ **IMPORTANT** : Ce workflow est configuré pour **2 repos séparés** (backend et frontend).  
> Voir [SETUP.md](./SETUP.md) pour la configuration initiale.

## 📋 Comment ça marche

### 0. **Configuration initiale** (une seule fois)
Avant la première utilisation, configure le repo backend dans `.github/workflows/build.yml` :
```yaml
env:
  BACKEND_REPO: 'ton-username/saaspharma-backend'  # ⚠️ Modifie cette ligne
  BACKEND_BRANCH: 'main'
```

Voir [SETUP.md](./SETUP.md) pour les détails complets.

### 1. **Déclenchement automatique**
Le workflow se déclenche automatiquement quand tu :
- Crées un tag de version (ex: `v1.0.0`, `v1.1.0`)
- Déclenches manuellement depuis l'onglet "Actions" de GitHub

Le workflow récupère automatiquement le backend depuis son repo séparé.

### 2. **Build multi-plateformes**
Le workflow build **3 versions** en parallèle :
- **macOS** : `.dmg` (Intel + Apple Silicon)
- **Windows** : `.exe` (installateur NSIS)
- **Linux** : `.AppImage`

### 3. **Publication automatique**
Une fois les builds terminés, une **Release GitHub** est créée avec tous les fichiers.

---

## 🎯 Utilisation

### Créer une nouvelle version

```bash
# 1. Mettre à jour la version dans package.json
cd saas-pharma-front
npm version patch  # ou minor, major

# 2. Créer un tag Git
git tag v$(node -p "require('./package.json').version")
git push origin main --tags
```

**OU** depuis GitHub :
1. Va dans **Releases** → **Draft a new release**
2. Crée un tag `v1.0.0` (ou autre)
3. Le workflow se déclenche automatiquement

### Déclencher manuellement

1. Va dans l'onglet **Actions** de ton repo GitHub
2. Sélectionne **Build Electron App**
3. Clique sur **Run workflow**
4. Choisis la branche (généralement `main`)
5. Clique sur **Run workflow**

---

## 📦 Résultat

Après le build, tu auras :

```
Release v1.0.0
├── Pharmacie Manager-1.0.0.dmg          (macOS Intel)
├── Pharmacie Manager-1.0.0-arm64.dmg   (macOS Apple Silicon)
├── Pharmacie Manager Setup 1.0.0.exe    (Windows)
└── Pharmacie Manager-1.0.0.AppImage    (Linux)
```

---

## 🔧 Configuration

### Variables d'environnement

Aucune variable secrète n'est nécessaire ! Le workflow utilise `GITHUB_TOKEN` automatiquement.

### Personnalisation

Tu peux modifier :
- **`.github/workflows/build.yml`** : Configuration du workflow
- **`package.json`** : Configuration electron-builder

---

## 🐛 Dépannage

### Le build échoue

1. Vérifie les **logs** dans l'onglet Actions
2. Vérifie que le backend se build correctement
3. Vérifie que toutes les dépendances sont dans `requirements.txt`

### Les artefacts ne sont pas créés

1. Vérifie que le backend packagé existe dans `backend/dist/pharmacie-backend/`
2. Vérifie que le frontend se build sans erreurs TypeScript
3. Vérifie les permissions des fichiers

### Windows build ne fonctionne pas

1. Vérifie que PyInstaller crée bien `pharmacie-backend.exe` (pas `.exe` manquant)
2. Vérifie que l'exécutable est dans `backend/dist/pharmacie-backend/`

---

## 📝 Notes importantes

- ⚠️ **Le backend doit être buildé pour chaque OS** (PyInstaller crée des exécutables spécifiques)
- ✅ **Le workflow build automatiquement le backend** avant de builder Electron
- 🔒 **Pas besoin de certificats** pour les builds (signature désactivée pour le moment)
- 🚀 **Gratuit** pour les repos publics (2000 minutes/mois)

---

## 🎉 Avantages

✅ **Pas besoin de Windows/macOS/Linux en local**  
✅ **Build automatique à chaque version**  
✅ **3 plateformes en parallèle**  
✅ **Release GitHub automatique**  
✅ **Gratuit pour les repos publics**

