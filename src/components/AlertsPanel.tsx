import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import api from '@/lib/axios';
import { 
  Bell,
  X,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  RefreshCw,
} from 'lucide-react';
import { Alert, AlertType, AlertPriority } from '@/types/stock';

const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  [AlertType.LOW_STOCK]: 'Stock faible',
  [AlertType.OUT_OF_STOCK]: 'Rupture de stock',
  [AlertType.EXPIRING_SOON]: 'Expire bientôt',
  [AlertType.EXPIRED]: 'Expiré',
  [AlertType.OVERSTOCK]: 'Surstock',
};

const ALERT_TYPE_ICONS: Record<AlertType, React.ComponentType<any>> = {
  [AlertType.LOW_STOCK]: AlertTriangle,
  [AlertType.OUT_OF_STOCK]: AlertCircle,
  [AlertType.EXPIRING_SOON]: AlertTriangle,
  [AlertType.EXPIRED]: AlertCircle,
  [AlertType.OVERSTOCK]: Info,
};

const ALERT_PRIORITY_COLORS: Record<AlertPriority, string> = {
  [AlertPriority.LOW]: 'bg-blue-50 border-blue-200 text-blue-800',
  [AlertPriority.MEDIUM]: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  [AlertPriority.HIGH]: 'bg-orange-50 border-orange-200 text-orange-800',
  [AlertPriority.CRITICAL]: 'bg-red-50 border-red-200 text-red-800',
};

const ALERT_PRIORITY_DOT_COLORS: Record<AlertPriority, string> = {
  [AlertPriority.LOW]: 'bg-blue-500',
  [AlertPriority.MEDIUM]: 'bg-yellow-500',
  [AlertPriority.HIGH]: 'bg-orange-500',
  [AlertPriority.CRITICAL]: 'bg-red-500',
};

export default function AlertsPanel() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  // Récupérer les alertes non résolues
  const { data: alerts, refetch } = useQuery({
    queryKey: ['alerts'],
    queryFn: async () => {
      const response = await api.get('/stock/alerts?is_resolved=false');
      return response.data as Alert[];
    },
    refetchInterval: 60000, // Rafraîchir toutes les minutes
  });

  // Marquer comme lu
  const markAsReadMutation = useMutation({
    mutationFn: async (alertId: number) => {
      await api.put(`/stock/alerts/${alertId}`, { is_read: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });

  // Résoudre une alerte
  const resolveMutation = useMutation({
    mutationFn: async (alertId: number) => {
      await api.put(`/stock/alerts/${alertId}`, { is_resolved: true });
    },
    onSuccess: () => {
      toast.success('Alerte résolue');
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
    onError: () => {
      toast.error('Erreur lors de la résolution de l\'alerte');
    },
  });

  const unreadCount = alerts?.filter(a => !a.is_read).length || 0;
  const criticalAlerts = alerts?.filter(a => a.priority === AlertPriority.CRITICAL) || [];

  const handleOpenPanel = () => {
    setIsOpen(true);
    // Marquer toutes les alertes comme lues
    alerts?.filter(a => !a.is_read).forEach(alert => {
      markAsReadMutation.mutate(alert.id);
    });
  };

  return (
    <>
      {/* Bouton d'alerte dans la navbar */}
      <button
        onClick={handleOpenPanel}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-600 rounded-full transform translate-x-1 -translate-y-1">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Panneau latéral */}
      {isOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          {/* Panneau */}
          <div className="fixed top-0 right-0 h-full w-full sm:w-96 bg-white shadow-2xl z-50 flex flex-col animate-slideInRight">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary-600" />
                <h2 className="text-lg font-semibold text-gray-900">Alertes</h2>
                {alerts && alerts.length > 0 && (
                  <span className="badge bg-gray-100 text-gray-700">
                    {alerts.length}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => refetch()}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Actualiser"
                >
                  <RefreshCw className="w-5 h-5 text-gray-600" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Alertes critiques en haut */}
            {criticalAlerts.length > 0 && (
              <div className="p-4 bg-red-50 border-b border-red-200">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <span className="font-semibold text-red-900">
                    {criticalAlerts.length} Alerte(s) critique(s)
                  </span>
                </div>
                <p className="text-sm text-red-700">
                  Nécessite une attention immédiate
                </p>
              </div>
            )}

            {/* Liste des alertes */}
            <div className="flex-1 overflow-y-auto">
              {!alerts || alerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
                  <CheckCircle className="w-16 h-16 mb-4 text-green-500" />
                  <p className="text-center font-medium">Aucune alerte</p>
                  <p className="text-sm text-center mt-1">Tout est sous contrôle!</p>
                </div>
              ) : (
                <div className="divide-y">
                  {alerts.map((alert) => {
                    const Icon = ALERT_TYPE_ICONS[alert.alert_type];
                    return (
                      <div
                        key={alert.id}
                        className={`p-4 hover:bg-gray-50 transition-colors ${
                          !alert.is_read ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="flex gap-3">
                          {/* Icône */}
                          <div className={`flex-shrink-0 p-2 rounded-lg ${ALERT_PRIORITY_COLORS[alert.priority]}`}>
                            <Icon className="w-5 h-5" />
                          </div>

                          {/* Contenu */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <h4 className="text-sm font-semibold text-gray-900 truncate">
                                {alert.title}
                              </h4>
                              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${ALERT_PRIORITY_DOT_COLORS[alert.priority]}`} />
                            </div>
                            
                            <p className="text-sm text-gray-600 mb-2">
                              {alert.message}
                            </p>

                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <span className="badge bg-gray-100 text-gray-700 text-xs">
                                  {ALERT_TYPE_LABELS[alert.alert_type]}
                                </span>
                                <span>
                                  {new Date(alert.created_at).toLocaleDateString('fr-FR')}
                                </span>
                              </div>

                              <button
                                onClick={() => resolveMutation.mutate(alert.id)}
                                disabled={resolveMutation.isPending}
                                className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                              >
                                Résoudre
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}

