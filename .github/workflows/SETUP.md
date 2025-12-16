# 🔧 Configuration du Workflow pour 2 Repos Séparés

Ce workflow build l'app Electron en récupérant le backend depuis un repo GitHub séparé.

## 📋 Configuration Requise

### 1. Configuration du repo backend

Le workflow est déjà configuré avec :
- **Backend repo** : `naimlawani01/saas-pharma`
- **Frontend repo** : `naimlawani01/saas-pharma-front` (repo courant)

Si tu veux changer le repo backend, modifie cette ligne dans `.github/workflows/build.yml` :

```yaml
env:
  BACKEND_REPO: 'naimlawani01/saas-pharma'  # Modifie ici si besoin
  BACKEND_BRANCH: 'main'
```

### 2. Si le repo backend est PRIVÉ

Si ton repo backend est privé, tu dois créer un **Personal Access Token (PAT)** :

1. Va sur GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Crée un nouveau token avec la permission `repo` (accès complet aux repos privés)
3. Va dans ton repo **frontend** → Settings → Secrets and variables → Actions
4. Ajoute un secret nommé `BACKEND_REPO_TOKEN` avec la valeur de ton token

Le workflow utilisera automatiquement ce token pour accéder au repo backend privé.

### 3. Si le repo backend est PUBLIC

Aucune configuration supplémentaire nécessaire ! Le workflow utilisera `GITHUB_TOKEN` automatiquement.

---

## 🚀 Utilisation

### Option 1 : Tag automatique (recommandé)

```bash
# Dans le repo FRONTEND
cd saas-pharma-front
npm version patch  # ou minor, major

# Créer un tag
git tag v$(node -p "require('./package.json').version")
git push origin main --tags
```

Le workflow se déclenche automatiquement et récupère le backend depuis son repo.

### Option 2 : Déclencher manuellement

1. Va dans l'onglet **Actions** du repo frontend
2. Sélectionne **Build Electron App**
3. Clique sur **Run workflow**
4. Remplis les champs :
   - **Backend repository** : `ton-username/saaspharma-backend` (ou laisse vide si configuré dans le workflow)
   - **Backend branch** : `main` (ou la branche que tu veux)
5. Clique sur **Run workflow**

---

## 📁 Structure Attendue

Le workflow crée cette structure dans GitHub Actions :

```
workspace/
├── frontend/          # Repo frontend (checkout automatique)
│   ├── dist/
│   ├── electron/
│   └── package.json
└── backend/           # Repo backend (checkout depuis repo séparé)
    ├── app/
    ├── dist/
    │   └── pharmacie-backend/
    └── build_backend.py
```

Le `package.json` du frontend attend le backend dans `../backend/dist/pharmacie-backend`, ce qui correspond à cette structure.

---

## 🔍 Dépannage

### Erreur : "Repository not found"

- Vérifie que le nom du repo backend est correct dans le workflow
- Si le repo est privé, vérifie que `BACKEND_REPO_TOKEN` est configuré

### Erreur : "Backend build manquant"

- Vérifie que le backend se build correctement dans son repo
- Vérifie que `build_backend.py` fonctionne
- Regarde les logs du step "Build Backend (PyInstaller)"

### Erreur : "Backend not found" dans electron-builder

- Vérifie que le backend est bien dans `backend/dist/pharmacie-backend/`
- Vérifie les logs du step "Verify Backend Structure"

---

## ✅ Checklist

- [ ] Nom du repo backend modifié dans le workflow
- [ ] Si repo backend privé : `BACKEND_REPO_TOKEN` créé dans les secrets
- [ ] Test du workflow avec un tag ou déclenchement manuel
- [ ] Vérification que les builds se créent correctement

---

## 📝 Notes

- Le workflow build le backend **pour chaque OS** (macOS, Windows, Linux)
- PyInstaller crée des exécutables spécifiques à chaque OS
- Le backend est inclus dans l'app Electron via `extraResources` dans `package.json`

