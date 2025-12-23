import { useState, useEffect } from 'react';
import { useLicenseStore } from '@/stores/licenseStore';
import { getSystemInfo } from '@/services/hardwareId';
import Modal from '@/components/ui/Modal';
import { AlertCircle, CheckCircle, Loader2, X, Key, Monitor, Shield } from 'lucide-react';

interface LicenseActivationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onActivated?: () => void;
  embedded?: boolean; // Mode intégré - pas de fermeture possible
}

export default function LicenseActivationModal({
  isOpen,
  onClose,
  onActivated,
  embedded = false,
}: LicenseActivationModalProps) {
  const { activate, isLoading, error, clearError, hardwareId } = useLicenseStore();
  const [licenseKey, setLicenseKey] = useState('');
  const [activationSuccess, setActivationSuccess] = useState(false);
  const [systemInfo, setSystemInfo] = useState<{
    machineName: string;
    osInfo: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen || embedded) {
      setLicenseKey('');
      setActivationSuccess(false);
      clearError();
      // Charger les informations système
      getSystemInfo().then((info) => {
        setSystemInfo({
          machineName: info.machineName,
          osInfo: info.osInfo,
        });
      });
    }
  }, [isOpen, clearError, embedded]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!licenseKey.trim()) {
      return;
    }

    clearError();
    const result = await activate(licenseKey);
    
    if (result.success) {
      setActivationSuccess(true);
      // Attendre un peu pour que l'état soit mis à jour
      setTimeout(() => {
        onActivated?.();
        if (!embedded) {
          onClose();
        }
      }, 500);
    }
  };

  const formatLicenseKey = (value: string) => {
    // Supprimer tous les caractères non alphanumériques (tirets, espaces, etc.) et convertir en majuscules
    const cleaned = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    // Limiter à 16 caractères max
    const limited = cleaned.slice(0, 16);
    // Formater avec des tirets tous les 4 caractères
    return limited.match(/.{1,4}/g)?.join('-') || limited;
  };

  const handleLicenseKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatLicenseKey(e.target.value);
    setLicenseKey(formatted);
    clearError();
  };

  // Mode intégré - contenu direct sans Modal wrapper
  if (embedded) {
    // Si activation réussie, afficher un message de succès
    if (activationSuccess) {
      return (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </div>
          <h3 className="text-xl font-semibold text-slate-900 mb-2">Licence activée !</h3>
          <p className="text-slate-600">Redirection en cours...</p>
        </div>
      );
    }

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Informations système */}
        {systemInfo && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Monitor className="w-5 h-5 text-slate-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900 mb-1">Votre machine</p>
                <p className="text-xs text-slate-600">{systemInfo.machineName}</p>
                <p className="text-xs text-slate-500 mt-0.5">{systemInfo.osInfo}</p>
              </div>
            </div>
          </div>
        )}

        {/* Erreur */}
        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Champ de licence */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Clé de licence
          </label>
          <div className="relative">
            <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={licenseKey}
              onChange={handleLicenseKeyChange}
              placeholder="XXXX-XXXX-XXXX-XXXX"
              className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl bg-white text-center font-mono tracking-wider focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              autoComplete="off"
            />
          </div>
        </div>

        {/* Bouton d'activation */}
        <button
          type="submit"
          disabled={!licenseKey.trim() || isLoading}
          className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:from-slate-400 disabled:to-slate-500 text-white py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-200/50"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Vérification...
            </>
          ) : (
            <>
              <Shield className="w-5 h-5" />
              Activer la licence
            </>
          )}
        </button>

        <p className="text-xs text-center text-slate-500">
          Contactez votre administrateur si vous n'avez pas de licence
        </p>
      </form>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Activation de la licence">
      <div className="space-y-6">
        {/* Informations système */}
        {systemInfo && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Monitor className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900 mb-1">Informations de la machine</p>
                <p className="text-xs text-blue-700">{systemInfo.machineName}</p>
                <p className="text-xs text-blue-600 mt-1">{systemInfo.osInfo}</p>
                {hardwareId && (
                  <p className="text-xs text-blue-500 mt-1 font-mono">ID: {hardwareId.substring(0, 20)}...</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 mb-2">Comment activer votre licence ?</p>
              <ol className="text-xs text-gray-700 space-y-1 list-decimal list-inside">
                <li>Entrez votre clé de licence dans le champ ci-dessous</li>
                <li>La clé sera vérifiée et activée sur cette machine</li>
                <li>Vous pourrez utiliser l'application en mode hors ligne</li>
                <li>La licence peut être activée sur jusqu'à 2 machines</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Erreur */}
          {error && (
            <div className="flex items-start gap-3 rounded-lg border-l-4 border-red-400 bg-red-50 p-4 text-red-700">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">{error}</p>
              </div>
              <button
                type="button"
                onClick={clearError}
                className="flex-shrink-0 p-1 hover:bg-red-100 rounded"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Champ clé de licence */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Key className="w-4 h-4 inline mr-2" />
              Clé de licence
            </label>
            <input
              type="text"
              value={licenseKey}
              onChange={handleLicenseKeyChange}
              placeholder="XXXX-XXXX-XXXX-XXXX"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-lg tracking-wider"
              maxLength={24} // 4 groupes de 4 caractères + 3 tirets
              disabled={isLoading}
              required
              autoFocus
            />
            <p className="mt-1 text-xs text-gray-500">
              Format: XXXX-XXXX-XXXX-XXXX (sans espaces)
            </p>
          </div>

          {/* Boutons */}
          <div className="flex items-center gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isLoading || !licenseKey.trim()}
              className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Activation...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Activer
                </>
              )}
            </button>
          </div>
        </form>

        {/* Aide */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            Vous n'avez pas de clé de licence ?{' '}
            <a
              href="https://fanke.com/contact"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-600 hover:text-purple-700 underline"
            >
              Contactez-nous
            </a>
          </p>
        </div>
      </div>
    </Modal>
  );
}

