import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { 
  DollarSign,
  Clock,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Calculator,
  Settings as SettingsIcon,
  History as HistoryIcon,
} from 'lucide-react';
import { CashSession, CashSessionStatus, CashCount, CashRegister } from '@/types/cash';
import { isOfflineError } from '@/utils/offlineHandler';
import { cashStore, saveToOffline, getFromOffline, removeFromOffline } from '@/services/offlineStorage';

export default function CashRegisterPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [localSession, setLocalSession] = useState<CashSession | null>(null);

  // Récupérer la session actuelle
  const { data: currentSession, isLoading } = useQuery({
    queryKey: ['current-cash-session'],
    queryFn: async () => {
      const response = await api.get('/cash/sessions/current');
      return response.data as CashSession | null;
    },
    refetchInterval: 10000, // Rafraîchir toutes les 10s
    refetchOnWindowFocus: true, // Rafraîchir quand la fenêtre reprend le focus
    refetchOnMount: true, // Rafraîchir au montage du composant
    enabled: navigator.onLine, // Si offline, on s'appuie sur la session locale
  });

  // Charger une session locale si offline
  useEffect(() => {
    const loadLocalSession = async () => {
      const stored = await getFromOffline<CashSession>(cashStore, 'pending_session');
      if (stored) {
        setLocalSession(stored);
      } else {
        setLocalSession(null);
      }
    };
    loadLocalSession();
  }, [navigator.onLine]);

  // Si une session serveur est disponible, effacer la session locale
  useEffect(() => {
    const clearLocalIfServerHasSession = async () => {
      if (currentSession) {
        await removeFromOffline(cashStore, 'pending_session');
        setLocalSession(null);
      }
    };
    clearLocalIfServerHasSession();
  }, [currentSession]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-GN').format(value) + ' GNF';
  };

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString('fr-FR');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const effectiveSession = currentSession || localSession;
  const isOpen = effectiveSession?.status === CashSessionStatus.OPEN || effectiveSession?.status === CashSessionStatus.PENDING_OFFLINE;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Gestion de Caisse</h1>
          <p className="text-gray-500">
            {isOpen ? 'Session en cours' : 'Aucune session ouverte'}
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => navigate('/cash/registers')}
            className="btn-secondary flex items-center gap-2"
            title="Gérer les caisses"
          >
            <SettingsIcon className="w-5 h-5" />
            Gérer
          </button>
          <button 
            onClick={() => navigate('/cash/history')}
            className="btn-secondary flex items-center gap-2"
            title="Historique"
          >
            <HistoryIcon className="w-5 h-5" />
            Historique
          </button>
          {!isOpen ? (
            <button 
              onClick={() => setShowOpenModal(true)}
              className="btn-primary flex items-center gap-2"
            >
              <DollarSign className="w-5 h-5" />
              Ouvrir la caisse
            </button>
          ) : (
            <button 
              onClick={() => setShowCloseModal(true)}
              className="btn-danger flex items-center gap-2"
            >
              <CheckCircle className="w-5 h-5" />
              Fermer la caisse
            </button>
          )}
        </div>
      </div>

      {/* Indicateur de caisse active */}
      {isOpen && effectiveSession && (
        <CashRegisterIndicator cashRegisterId={effectiveSession.cash_register_id} />
      )}

      {/* État de la caisse */}
      {isOpen && effectiveSession ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Session Info */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Session</span>
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{effectiveSession.session_number || 'SESSION-OFFLINE'}</p>
            <p className="text-xs text-gray-500 mt-1">
              Ouvert le {formatDateTime(effectiveSession.opening_date || new Date().toISOString())}
            </p>
            {effectiveSession.status === CashSessionStatus.PENDING_OFFLINE && (
              <p className="text-xs font-semibold text-orange-600 mt-2">Session en attente de synchronisation</p>
            )}
          </div>

          {/* Fond initial */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Fond initial</span>
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(effectiveSession.opening_balance)}
            </p>
          </div>

          {/* Ventes */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Ventes du jour</span>
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(effectiveSession.total_sales)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {effectiveSession.sales_count || 0} vente(s)
            </p>
          </div>

          {/* Total attendu */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Total attendu</span>
              <Calculator className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(
                (effectiveSession.opening_balance || 0) +
                (effectiveSession.total_sales || 0) -
                (effectiveSession.total_refunds || 0) -
                (effectiveSession.total_expenses || 0)
              )}
            </p>
          </div>
        </div>
      ) : (
        <div className="card p-12 text-center">
          <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Aucune session de caisse ouverte
          </h3>
          <p className="text-gray-500 mb-6">
            Ouvrez une session pour commencer à enregistrer les transactions
          </p>
          <button 
            onClick={() => setShowOpenModal(true)}
            className="btn-primary"
          >
            Ouvrir la caisse
          </button>
        </div>
      )}

      {/* Modals */}
      {showOpenModal && (
        <OpenCashModal
          pharmacyId={user?.pharmacy_id || 0}
          onClose={() => setShowOpenModal(false)}
          onSuccess={() => {
            setShowOpenModal(false);
            queryClient.invalidateQueries({ queryKey: ['current-cash-session'] });
          }}
        />
      )}

      {showCloseModal && effectiveSession && effectiveSession.status === CashSessionStatus.OPEN && (
        <CloseCashModal
          session={effectiveSession}
          onClose={() => setShowCloseModal(false)}
          onSuccess={() => {
            setShowCloseModal(false);
            queryClient.invalidateQueries({ queryKey: ['current-cash-session'] });
          }}
        />
      )}
    </div>
  );
}

// Modal d'ouverture de caisse
interface OpenCashModalProps {
  pharmacyId: number;
  onClose: () => void;
  onSuccess: () => void;
}

function OpenCashModal({ pharmacyId, onClose, onSuccess }: OpenCashModalProps) {
  const [formData, setFormData] = useState({
    cash_register_id: 0, // Aucune caisse sélectionnée par défaut
    opening_balance: 50000,
    opening_notes: '',
  });

  // Récupérer la liste des caisses actives
  const { data: cashRegisters, isLoading: loadingRegisters } = useQuery({
    queryKey: ['cash-registers-active'],
    queryFn: async () => {
      const response = await api.get('/cash/registers');
      const registers = response.data as CashRegister[];
      return registers.filter(r => r.is_active);
    },
  });

  const openMutation = useMutation({
    mutationFn: async (data: any) => {
      try {
        const response = await api.post('/cash/sessions/open', data);
        return response.data;
      } catch (error: any) {
        // Gérer les erreurs offline (intercepteur ou erreur réseau sans réponse)
        if (isOfflineError(error)) {
          const offlineErr: any = new Error('OFFLINE_SAVED');
          offlineErr.isOffline = true;
          throw offlineErr;
        }
        throw error;
      }
    },
    onSuccess: async () => {
      toast.success('Caisse ouverte avec succès');
      await removeFromOffline(cashStore, 'pending_session');
      onSuccess();
    },
    onError: async (error: any) => {
      if (error?.message === 'OFFLINE_SAVED' || isOfflineError(error)) {
        const offlineSession: CashSession = {
          id: Date.now(),
          cash_register_id: formData.cash_register_id,
          pharmacy_id: pharmacyId,
          opened_by: user?.id || 0,
          closed_by: null,
          session_number: `OFFLINE-${Date.now()}`,
          status: CashSessionStatus.PENDING_OFFLINE,
          opening_date: new Date().toISOString(),
          opening_balance: formData.opening_balance,
          opening_notes: formData.opening_notes,
          closing_date: null,
          closing_balance: null,
          cash_counted: null,
          card_total: 0,
          mobile_money_total: 0,
          check_total: 0,
          expected_cash: null,
          expected_total: null,
          cash_difference: null,
          total_difference: null,
          total_sales: 0,
          total_refunds: 0,
          total_expenses: 0,
          sales_count: 0,
          closing_notes: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        await saveToOffline(cashStore, 'pending_session', offlineSession);
        setLocalSession(offlineSession);

        toast.success('Ouverture de caisse enregistrée localement. Synchronisation automatique à la reconnexion.');
        onSuccess();
      } else {
        toast.error(error.response?.data?.detail || 'Erreur lors de l\'ouverture de la caisse');
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.cash_register_id === 0) {
      toast.error('Veuillez sélectionner une caisse');
      return;
    }
    
    openMutation.mutate({
      ...formData,
      pharmacy_id: pharmacyId,
    });
  };

  if (loadingRegisters) {
    return (
      <div className="modal-overlay">
        <div className="modal-content max-w-md">
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-md">
        <div className="modal-header">
          <h3 className="modal-title">Ouvrir la caisse</h3>
          <button onClick={onClose} className="modal-close">&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body space-y-4">
            {/* Sélecteur de caisse */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Choisir une caisse *
              </label>
              <select
                value={formData.cash_register_id}
                onChange={(e) => setFormData({ ...formData, cash_register_id: parseInt(e.target.value) })}
                className="input"
                required
              >
                <option value={0}>-- Sélectionner une caisse --</option>
                {cashRegisters?.map((register) => (
                  <option key={register.id} value={register.id}>
                    {register.name} ({register.code}) {register.location ? `- ${register.location}` : ''}
                  </option>
                ))}
              </select>
              {(!cashRegisters || cashRegisters.length === 0) && (
                <p className="text-sm text-red-600 mt-1">
                  ⚠️ Aucune caisse active. Contactez votre administrateur.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fond de caisse initial (GNF) *
              </label>
              <input
                type="number"
                value={formData.opening_balance}
                onChange={(e) => setFormData({ ...formData, opening_balance: parseFloat(e.target.value) || 0 })}
                className="input"
                min="0"
                step="1000"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Montant en espèces au début de la journée
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (optionnel)
              </label>
              <textarea
                value={formData.opening_notes}
                onChange={(e) => setFormData({ ...formData, opening_notes: e.target.value })}
                className="input"
                rows={3}
                placeholder="Remarques sur l'ouverture..."
              />
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={openMutation.isPending}
              className="btn-primary"
            >
              {openMutation.isPending ? 'Ouverture...' : 'Ouvrir la caisse'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Modal de fermeture de caisse
interface CloseCashModalProps {
  session: CashSession;
  onClose: () => void;
  onSuccess: () => void;
}

function CloseCashModal({ session, onClose, onSuccess }: CloseCashModalProps) {
  const [formData, setFormData] = useState({
    cash_counted: 0,
    card_total: 0,
    mobile_money_total: 0,
    check_total: 0,
    closing_notes: '',
  });

  const [showCashCount, setShowCashCount] = useState(false);
  const [cashCount, setCashCount] = useState<CashCount>({
    bills_20000: 0,
    bills_10000: 0,
    bills_5000: 0,
    bills_2000: 0,
    bills_1000: 0,
    bills_500: 0,
    coins_500: 0,
    coins_100: 0,
    coins_50: 0,
    coins_25: 0,
  });

  const expectedCash = session.opening_balance + session.total_sales - session.total_refunds - session.total_expenses;
  const cashDifference = formData.cash_counted - expectedCash;
  const totalCounted = formData.cash_counted + formData.card_total + formData.mobile_money_total + formData.check_total;

  const closeMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.put(`/cash/sessions/${session.id}/close`, data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Caisse fermée avec succès');
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Erreur lors de la fermeture de la caisse');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    closeMutation.mutate({
      ...formData,
      cash_count: showCashCount ? cashCount : undefined,
    });
  };

  const calculateCashCount = () => {
    const total = 
      cashCount.bills_20000 * 20000 +
      cashCount.bills_10000 * 10000 +
      cashCount.bills_5000 * 5000 +
      cashCount.bills_2000 * 2000 +
      cashCount.bills_1000 * 1000 +
      cashCount.bills_500 * 500 +
      cashCount.coins_500 * 500 +
      cashCount.coins_100 * 100 +
      cashCount.coins_50 * 50 +
      cashCount.coins_25 * 25;
    setFormData({ ...formData, cash_counted: total });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-GN').format(value) + ' GNF';
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-4xl">
        <div className="modal-header">
          <h3 className="modal-title">Fermer la caisse</h3>
          <button onClick={onClose} className="modal-close">&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body space-y-6">
            {/* Résumé de la session */}
            <div className="card bg-gray-50 p-4">
              <h4 className="font-semibold mb-3">Résumé de la session</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-600">Fond initial:</span>
                  <span className="font-semibold ml-2">{formatCurrency(session.opening_balance)}</span>
                </div>
                <div>
                  <span className="text-gray-600">Ventes:</span>
                  <span className="font-semibold ml-2 text-green-600">+{formatCurrency(session.total_sales)}</span>
                </div>
                <div>
                  <span className="text-gray-600">Remboursements:</span>
                  <span className="font-semibold ml-2 text-red-600">-{formatCurrency(session.total_refunds)}</span>
                </div>
                <div>
                  <span className="text-gray-600">Dépenses:</span>
                  <span className="font-semibold ml-2 text-red-600">-{formatCurrency(session.total_expenses)}</span>
                </div>
                <div className="col-span-2 pt-2 border-t">
                  <span className="text-gray-600">Espèces attendues:</span>
                  <span className="font-bold ml-2 text-lg">{formatCurrency(expectedCash)}</span>
                </div>
              </div>
            </div>

            {/* Comptage des espèces */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Espèces comptées (GNF) *
                </label>
                <button
                  type="button"
                  onClick={() => setShowCashCount(!showCashCount)}
                  className="text-sm text-primary-600 hover:text-primary-700"
                >
                  {showCashCount ? 'Saisie rapide' : 'Comptage détaillé'}
                </button>
              </div>

              {!showCashCount ? (
                <input
                  type="number"
                  value={formData.cash_counted || ''}
                  onChange={(e) => setFormData({ ...formData, cash_counted: parseFloat(e.target.value) || 0 })}
                  className="input"
                  min="0"
                  step="100"
                  required
                />
              ) : (
                <div className="card bg-gray-50 p-4 space-y-2">
                  <div className="grid grid-cols-4 gap-3 text-sm">
                    {[
                      { label: '20000 GNF', key: 'bills_20000', value: 20000 },
                      { label: '10000 GNF', key: 'bills_10000', value: 10000 },
                      { label: '5000 GNF', key: 'bills_5000', value: 5000 },
                      { label: '2000 GNF', key: 'bills_2000', value: 2000 },
                      { label: '1000 GNF', key: 'bills_1000', value: 1000 },
                      { label: '500 GNF', key: 'bills_500', value: 500 },
                      { label: '500 GNF (pièces)', key: 'coins_500', value: 500 },
                      { label: '100 GNF', key: 'coins_100', value: 100 },
                      { label: '50 GNF', key: 'coins_50', value: 50 },
                      { label: '25 GNF', key: 'coins_25', value: 25 },
                    ].map((item) => (
                      <div key={item.key}>
                        <label className="text-xs text-gray-600">{item.label}</label>
                        <input
                          type="number"
                          value={cashCount[item.key as keyof CashCount] || ''}
                          onChange={(e) => {
                            const newCount = { ...cashCount, [item.key]: parseInt(e.target.value) || 0 };
                            setCashCount(newCount);
                          }}
                          onBlur={calculateCashCount}
                          className="input text-sm"
                          min="0"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="text-right pt-2 border-t">
                    <span className="text-sm font-semibold">Total: {formatCurrency(formData.cash_counted)}</span>
                  </div>
                </div>
              )}

              {/* Écart */}
              {formData.cash_counted > 0 && (
                <div className={`mt-2 p-3 rounded-lg ${
                  cashDifference === 0 ? 'bg-green-50 text-green-700' : 
                  Math.abs(cashDifference) <= 1000 ? 'bg-yellow-50 text-yellow-700' : 
                  'bg-red-50 text-red-700'
                }`}>
                  <span className="font-semibold">Écart: {cashDifference > 0 ? '+' : ''}{formatCurrency(cashDifference)}</span>
                  {cashDifference === 0 && <span className="ml-2">✓ Parfait!</span>}
                </div>
              )}
            </div>

            {/* Autres moyens de paiement */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Carte bancaire (GNF)
                </label>
                <input
                  type="number"
                  value={formData.card_total || ''}
                  onChange={(e) => setFormData({ ...formData, card_total: parseFloat(e.target.value) || 0 })}
                  className="input"
                  min="0"
                  step="100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mobile Money (GNF)
                </label>
                <input
                  type="number"
                  value={formData.mobile_money_total || ''}
                  onChange={(e) => setFormData({ ...formData, mobile_money_total: parseFloat(e.target.value) || 0 })}
                  className="input"
                  min="0"
                  step="100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Chèques (GNF)
                </label>
                <input
                  type="number"
                  value={formData.check_total || ''}
                  onChange={(e) => setFormData({ ...formData, check_total: parseFloat(e.target.value) || 0 })}
                  className="input"
                  min="0"
                  step="100"
                />
              </div>
            </div>

            {/* Total compté */}
            <div className="card bg-primary-50 p-4">
              <div className="text-center">
                <span className="text-sm text-gray-600">Total compté</span>
                <p className="text-2xl font-bold text-primary-700">{formatCurrency(totalCounted)}</p>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes de fermeture
              </label>
              <textarea
                value={formData.closing_notes}
                onChange={(e) => setFormData({ ...formData, closing_notes: e.target.value })}
                className="input"
                rows={3}
                placeholder="Remarques, incidents, etc..."
              />
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={closeMutation.isPending || formData.cash_counted === 0}
              className="btn-danger"
            >
              {closeMutation.isPending ? 'Fermeture...' : 'Fermer la caisse'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Indicateur visuel de la caisse active
interface CashRegisterIndicatorProps {
  cashRegisterId: number;
}

function CashRegisterIndicator({ cashRegisterId }: CashRegisterIndicatorProps) {
  const { data: cashRegister } = useQuery({
    queryKey: ['cash-register', cashRegisterId],
    queryFn: async () => {
      const response = await api.get(`/cash/registers/${cashRegisterId}`);
      return response.data as CashRegister;
    },
  });

  if (!cashRegister) return null;

  return (
    <div className="card p-4 bg-primary-50 border-primary-200">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
          <SettingsIcon className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-primary-900">Caisse active</p>
          <p className="text-lg font-bold text-primary-700">{cashRegister.name}</p>
        </div>
        {cashRegister.location && (
          <div className="text-right">
            <p className="text-xs text-primary-600">📍 {cashRegister.location}</p>
          </div>
        )}
      </div>
    </div>
  );
}

