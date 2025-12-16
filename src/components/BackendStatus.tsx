import { useState, useEffect } from 'react';
import { Server, RefreshCw, CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface BackendStatusInfo {
  running: boolean;
  url: string;
  port: number;
}

/**
 * Composant affichant le statut du backend local (Electron uniquement)
 */
export function BackendStatus() {
  const [status, setStatus] = useState<BackendStatusInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Ne pas afficher si on n'est pas dans Electron
  const isElectron = typeof window !== 'undefined' && window.electron === true;
  
  useEffect(() => {
    if (!isElectron) return;
    
    const checkStatus = async () => {
      try {
        setLoading(true);
        const result = await window.electronAPI?.getBackendStatus();
        if (result) {
          setStatus(result);
          setError(null);
        }
      } catch (err) {
        setError('Impossible de vérifier le statut');
      } finally {
        setLoading(false);
      }
    };
    
    // Vérifier immédiatement
    checkStatus();
    
    // Vérifier toutes les 30 secondes
    const interval = setInterval(checkStatus, 30000);
    
    return () => clearInterval(interval);
  }, [isElectron]);
  
  const handleRestart = async () => {
    if (!window.electronAPI?.restartBackend) return;
    
    setRestarting(true);
    setError(null);
    
    try {
      const result = await window.electronAPI.restartBackend();
      if (result.success) {
        // Attendre un peu puis revérifier le statut
        setTimeout(async () => {
          const newStatus = await window.electronAPI?.getBackendStatus();
          if (newStatus) {
            setStatus(newStatus);
          }
          setRestarting(false);
        }, 2000);
      } else {
        setError(result.error || 'Échec du redémarrage');
        setRestarting(false);
      }
    } catch (err) {
      setError('Erreur lors du redémarrage');
      setRestarting(false);
    }
  };
  
  // Ne rien afficher si pas dans Electron
  if (!isElectron) {
    return null;
  }
  
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm">
      <Server className="w-4 h-4 text-gray-500" />
      
      {loading ? (
        <span className="text-gray-500">Vérification...</span>
      ) : status ? (
        <>
          {status.running ? (
            <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
              <CheckCircle className="w-4 h-4" />
              Backend local actif
            </span>
          ) : (
            <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
              <XCircle className="w-4 h-4" />
              Backend arrêté
            </span>
          )}
          
          <button
            onClick={handleRestart}
            disabled={restarting}
            className="ml-2 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
            title="Redémarrer le backend"
          >
            {restarting ? (
              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
            ) : (
              <RefreshCw className="w-4 h-4 text-gray-500 hover:text-blue-500" />
            )}
          </button>
        </>
      ) : (
        <span className="text-gray-500">État inconnu</span>
      )}
      
      {error && (
        <span className="text-red-500 text-xs ml-2">{error}</span>
      )}
    </div>
  );
}

export default BackendStatus;

