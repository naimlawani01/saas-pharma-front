import { useState, useEffect } from 'react';
import { 
  Cloud, 
  CloudOff, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Settings,
  Link,
  Unlink,
  Upload,
  Download,
  Clock,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { cloudSyncService, SyncConfig, SyncStatus, SyncResult } from '@/services/cloudSyncService';
import toast from 'react-hot-toast';

export default function SyncSettingsPage() {
  const [config, setConfig] = useState<SyncConfig>({
    cloudUrl: '',
    enabled: false,
    autoSync: false,
    syncInterval: 15,
  });
  
  const [localStatus, setLocalStatus] = useState<SyncStatus | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  
  // Formulaire de connexion cloud
  const [cloudEmail, setCloudEmail] = useState('');
  const [cloudPassword, setCloudPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    // Charger la config sauvegardée
    const savedConfig = cloudSyncService.getConfig();
    if (savedConfig) {
      setConfig(savedConfig);
    }
    
    // Vérifier si connecté au cloud
    setIsConnected(cloudSyncService.isCloudConnected());
    
    // Charger le statut local
    loadLocalStatus();
  }, []);

  const loadLocalStatus = async () => {
    const status = await cloudSyncService.getLocalSyncStatus();
    setLocalStatus(status);
  };

  const handleTestConnection = async () => {
    if (!config.cloudUrl) {
      toast.error('Veuillez entrer l\'URL du serveur cloud');
      return;
    }

    setIsTesting(true);
    try {
      const result = await cloudSyncService.testCloudConnection(config.cloudUrl);
      if (result.success) {
        toast.success('Connexion au serveur réussie !');
      } else {
        toast.error(result.message);
      }
    } catch (e: any) {
      toast.error('Erreur de connexion');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveConfig = () => {
    cloudSyncService.saveConfig(config);
    toast.success('Configuration sauvegardée');
  };

  const handleCloudLogin = async () => {
    if (!cloudEmail || !cloudPassword) {
      toast.error('Veuillez entrer vos identifiants');
      return;
    }

    setIsLoggingIn(true);
    try {
      await cloudSyncService.loginToCloud(cloudEmail, cloudPassword);
      setIsConnected(true);
      setCloudPassword('');
      toast.success('Connecté au serveur cloud !');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleCloudLogout = () => {
    cloudSyncService.logoutFromCloud();
    setIsConnected(false);
    toast.success('Déconnecté du serveur cloud');
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const result = await cloudSyncService.fullSync();
      setLastSyncResult(result);
      
      if (result.success) {
        toast.success(`Synchronisation réussie ! ${result.uploaded} envoyés, ${result.downloaded} reçus`);
      } else {
        toast.error(`Synchronisation avec erreurs: ${result.errors.join(', ')}`);
      }
      
      // Recharger le statut
      await loadLocalStatus();
    } catch (e: any) {
      toast.error('Erreur de synchronisation');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Synchronisation Cloud</h1>
          <p className="text-gray-600 mt-1">
            Configurez la synchronisation avec votre serveur cloud
          </p>
        </div>
        <div className="flex items-center gap-2">
          {config.enabled && isConnected ? (
            <span className="flex items-center gap-2 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-sm">
              <Cloud className="w-4 h-4" />
              Connecté
            </span>
          ) : (
            <span className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-full text-sm">
              <CloudOff className="w-4 h-4" />
              Hors ligne
            </span>
          )}
        </div>
      </div>

      {/* Statut local */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5 text-gray-500" />
          Statut de synchronisation
        </h2>
        
        {localStatus ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600">Produits en attente</div>
              <div className="text-2xl font-bold text-gray-900">{localStatus.pending_sync.products}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600">Ventes en attente</div>
              <div className="text-2xl font-bold text-gray-900">{localStatus.pending_sync.sales}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600">Clients en attente</div>
              <div className="text-2xl font-bold text-gray-900">{localStatus.pending_sync.customers}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600">Dernière sync</div>
              <div className="text-sm font-medium text-gray-900">
                {localStatus.last_sync_at 
                  ? new Date(localStatus.last_sync_at).toLocaleString('fr-FR')
                  : 'Jamais'
                }
              </div>
            </div>
          </div>
        ) : (
          <div className="text-gray-500">Chargement du statut...</div>
        )}
      </div>

      {/* Configuration serveur cloud */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Cloud className="w-5 h-5 text-blue-500" />
          Serveur Cloud
        </h2>

        <div className="space-y-4">
          {/* Activer/Désactiver */}
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">Activer la synchronisation cloud</div>
              <div className="text-sm text-gray-500">
                Synchronisez vos données avec un serveur distant
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {config.enabled && (
            <>
              {/* URL du serveur */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL du serveur cloud
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={config.cloudUrl}
                    onChange={(e) => setConfig({ ...config, cloudUrl: e.target.value })}
                    placeholder="https://votre-serveur.com"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                  <button
                    onClick={handleTestConnection}
                    disabled={isTesting || !config.cloudUrl}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 flex items-center gap-2"
                  >
                    {isTesting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Link className="w-4 h-4" />
                    )}
                    Tester
                  </button>
                </div>
              </div>

              {/* Auto-sync */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div>
                  <div className="font-medium text-gray-900">Synchronisation automatique</div>
                  <div className="text-sm text-gray-500">
                    Synchroniser automatiquement en arrière-plan
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.autoSync}
                    onChange={(e) => setConfig({ ...config, autoSync: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {config.autoSync && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Intervalle de synchronisation
                  </label>
                  <select
                    value={config.syncInterval}
                    onChange={(e) => setConfig({ ...config, syncInterval: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value={5}>Toutes les 5 minutes</option>
                    <option value={15}>Toutes les 15 minutes</option>
                    <option value={30}>Toutes les 30 minutes</option>
                    <option value={60}>Toutes les heures</option>
                  </select>
                </div>
              )}

              {/* Bouton sauvegarder */}
              <div className="pt-4">
                <button
                  onClick={handleSaveConfig}
                  className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  Sauvegarder la configuration
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Connexion au cloud */}
      {config.enabled && config.cloudUrl && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            {isConnected ? (
              <CheckCircle className="w-5 h-5 text-emerald-500" />
            ) : (
              <XCircle className="w-5 h-5 text-red-500" />
            )}
            Authentification Cloud
          </h2>

          {isConnected ? (
            <div className="flex items-center justify-between">
              <div className="text-gray-600">
                Vous êtes connecté au serveur cloud
              </div>
              <button
                onClick={handleCloudLogout}
                className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 flex items-center gap-2"
              >
                <Unlink className="w-4 h-4" />
                Se déconnecter
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-gray-600 text-sm">
                Connectez-vous avec vos identifiants cloud pour activer la synchronisation
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={cloudEmail}
                    onChange={(e) => setCloudEmail(e.target.value)}
                    placeholder="votre@email.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mot de passe
                  </label>
                  <input
                    type="password"
                    value={cloudPassword}
                    onChange={(e) => setCloudPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>
              <button
                onClick={handleCloudLogin}
                disabled={isLoggingIn}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {isLoggingIn ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Link className="w-4 h-4" />
                )}
                Se connecter au cloud
              </button>
            </div>
          )}
        </div>
      )}

      {/* Actions de synchronisation */}
      {config.enabled && isConnected && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-purple-500" />
            Synchronisation manuelle
          </h2>

          <div className="flex items-center gap-4">
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Synchronisation en cours...
                </>
              ) : (
                <>
                  <RefreshCw className="w-5 h-5" />
                  Synchroniser maintenant
                </>
              )}
            </button>
          </div>

          {/* Dernier résultat */}
          {lastSyncResult && (
            <div className={`mt-4 p-4 rounded-lg ${lastSyncResult.success ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="flex items-center gap-2 mb-2">
                {lastSyncResult.success ? (
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                )}
                <span className={`font-medium ${lastSyncResult.success ? 'text-emerald-700' : 'text-red-700'}`}>
                  {lastSyncResult.success ? 'Synchronisation réussie' : 'Synchronisation avec erreurs'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <Upload className="w-4 h-4" />
                  {lastSyncResult.uploaded} envoyés
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Download className="w-4 h-4" />
                  {lastSyncResult.downloaded} reçus
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock className="w-4 h-4" />
                  {new Date(lastSyncResult.timestamp).toLocaleTimeString('fr-FR')}
                </div>
              </div>
              {lastSyncResult.errors.length > 0 && (
                <div className="mt-2 text-sm text-red-600">
                  Erreurs: {lastSyncResult.errors.join(', ')}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex gap-3">
          <Cloud className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Comment fonctionne la synchronisation ?</p>
            <ul className="list-disc list-inside space-y-1 text-blue-700">
              <li>Vos données sont d'abord stockées localement (mode hors-ligne)</li>
              <li>Quand connecté, elles sont synchronisées vers le serveur cloud</li>
              <li>Les modifications du cloud sont aussi téléchargées</li>
              <li>En cas de conflit, la version la plus récente est conservée</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

