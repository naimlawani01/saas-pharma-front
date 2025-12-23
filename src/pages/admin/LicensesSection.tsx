import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Key, Plus, Search, RefreshCw, Trash2, Eye, Copy, CheckCircle, AlertCircle, X, Check } from 'lucide-react';
import clsx from 'clsx';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

export default function LicensesSection() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedLicense, setSelectedLicense] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [sectionError, setSectionError] = useState<string | null>(null);
  const [sectionSuccess, setSectionSuccess] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [licenseToDelete, setLicenseToDelete] = useState<any>(null);

  // Récupérer les licences
  const { data: licenses, isLoading, refetch } = useQuery({
    queryKey: ['admin-licenses', search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      const response = await api.get(`/admin/licenses?${params}`);
      return response.data;
    },
  });

  // Supprimer une licence
  const deleteMutation = useMutation({
    mutationFn: async (licenseId: number) => {
      return api.delete(`/admin/licenses/${licenseId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-licenses'] });
      setSectionSuccess('Licence supprimée avec succès');
      setSectionError(null);
      setLicenseToDelete(null);
      // Auto-hide après 3s
      setTimeout(() => setSectionSuccess(null), 3000);
    },
    onError: (error: any) => {
      setSectionError(error.response?.data?.detail || 'Erreur lors de la suppression de la licence');
      setLicenseToDelete(null);
    },
  });

  // Fonction pour copier une clé
  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'Jamais';
    return new Date(date).toLocaleDateString('fr-FR');
  };

  return (
    <div className="space-y-6">
      {/* Affichage des erreurs */}
      {sectionError && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <AlertCircle className="h-5 w-5 text-red-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">{sectionError}</p>
          </div>
          <button
            type="button"
            onClick={() => setSectionError(null)}
            className="flex-shrink-0 p-1.5 hover:bg-red-100 rounded-lg transition-colors"
          >
            <X className="h-4 w-4 text-red-500" />
          </button>
        </div>
      )}
      
      {/* Affichage des succès */}
      {sectionSuccess && (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <CheckCircle className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-emerald-800">{sectionSuccess}</p>
          </div>
          <button
            type="button"
            onClick={() => setSectionSuccess(null)}
            className="flex-shrink-0 p-1.5 hover:bg-emerald-100 rounded-lg transition-colors"
          >
            <X className="h-4 w-4 text-emerald-500" />
          </button>
        </div>
      )}
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Gestion des licences</h2>
          <p className="text-sm text-slate-500 mt-1">Générez et gérez les licences pour vos clients</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-purple-200 transition-all hover:scale-[1.02]"
        >
          <Plus className="w-5 h-5" />
          Générer une licence
        </button>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une licence (clé, client, email)..."
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all placeholder:text-slate-400"
          />
        </div>
        <button
          onClick={() => refetch()}
          disabled={isLoading}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium flex items-center gap-2 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Actualiser</span>
        </button>
      </div>

      {/* Licenses List */}
      <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-purple-600 border-t-transparent"></div>
              <p className="text-sm text-slate-500">Chargement...</p>
            </div>
          </div>
        ) : licenses && licenses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Clé de licence</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Client</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Commerce</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Statut</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Activations</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Expiration</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {licenses.map((license: any) => {
                  // Utiliser activations_count du backend, ou calculer depuis activations si disponible
                  const activeCount = license.activations_count ?? 
                    (license.activations?.filter((a: any) => a.is_active).length || 0);
                  return (
                    <tr key={license.id} className="group hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg flex items-center justify-center">
                            <Key className="w-4 h-4 text-purple-600" />
                          </div>
                          <code className="font-mono text-sm font-semibold text-slate-900">{license.license_key}</code>
                          <button
                            onClick={() => handleCopyKey(license.license_key)}
                            className={clsx(
                              "p-1.5 rounded-lg transition-all",
                              copiedKey === license.license_key 
                                ? "bg-emerald-100 text-emerald-600" 
                                : "hover:bg-slate-100 text-slate-400"
                            )}
                            title={copiedKey === license.license_key ? "Copié !" : "Copier la clé"}
                          >
                            {copiedKey === license.license_key ? (
                              <Check className="w-3.5 h-3.5" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-slate-900">{license.customer_name || 'N/A'}</p>
                          {license.customer_email && (
                            <p className="text-sm text-slate-500">{license.customer_email}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-slate-600">{license.pharmacy_id ? `ID: ${license.pharmacy_id}` : 'Non assigné'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={clsx(
                          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium',
                          license.status === 'active' ? 'bg-emerald-50 text-emerald-700' :
                          license.status === 'expired' ? 'bg-red-50 text-red-700' :
                          license.status === 'revoked' ? 'bg-slate-100 text-slate-700' :
                          'bg-amber-50 text-amber-700'
                        )}>
                          <span className={clsx(
                            'w-1.5 h-1.5 rounded-full',
                            license.status === 'active' ? 'bg-emerald-500' :
                            license.status === 'expired' ? 'bg-red-500' :
                            license.status === 'revoked' ? 'bg-slate-500' :
                            'bg-amber-500'
                          )} />
                          {license.status === 'active' ? 'Active' :
                          license.status === 'expired' ? 'Expirée' :
                          license.status === 'revoked' ? 'Révoquée' :
                          'Suspendue'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div 
                              className="h-full bg-purple-500 rounded-full"
                              style={{ width: `${(activeCount / license.max_activations) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm text-slate-600">{activeCount}/{license.max_activations}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-slate-600">{formatDate(license.expires_at)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setSelectedLicense(license);
                              setShowDetailModal(true);
                            }}
                            className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="Voir détails"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setLicenseToDelete(license)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 px-8">
            <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mb-5">
              <Key className="w-10 h-10 text-slate-400" />
            </div>
            <p className="text-lg font-semibold text-slate-900 mb-2">Aucune licence</p>
            <p className="text-sm text-slate-500 mb-6 text-center max-w-sm">Générez votre première licence pour un client</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-purple-200 transition-all hover:scale-[1.02]"
            >
              <Plus className="w-5 h-5" />
              Générer une licence
            </button>
          </div>
        )}
      </div>

      {/* Create License Modal */}
      <CreateLicenseModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />

      {/* License Detail Modal */}
      <LicenseDetailModal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedLicense(null);
        }}
        license={selectedLicense}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={!!licenseToDelete}
        title="Supprimer la licence"
        message={`Êtes-vous sûr de vouloir supprimer la licence ${licenseToDelete?.license_key} ? Cette action est irréversible.`}
        confirmText="Supprimer"
        cancelText="Annuler"
        onConfirm={() => {
          if (licenseToDelete) {
            deleteMutation.mutate(licenseToDelete.id);
          }
          setLicenseToDelete(null);
        }}
        onClose={() => setLicenseToDelete(null)}
        type="danger"
      />
    </div>
  );
}

// Create License Modal
function CreateLicenseModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [createError, setCreateError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    pharmacy_id: '',
    max_activations: 2,
    expires_at: '',
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    notes: '',
  });
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [keyCopied, setKeyCopied] = useState(false);

  const handleCopyGeneratedKey = () => {
    if (generatedKey) {
      navigator.clipboard.writeText(generatedKey);
      setKeyCopied(true);
      setTimeout(() => setKeyCopied(false), 2000);
    }
  };

  const { data: businesses } = useQuery({
    queryKey: ['admin-pharmacies'],
    queryFn: async () => {
      const response = await api.get('/admin/pharmacies');
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return api.post('/admin/licenses', data);
    },
    onSuccess: (response) => {
      const license = response.data;
      setGeneratedKey(license.license_key);
      setCreateError(null);
      queryClient.invalidateQueries({ queryKey: ['admin-licenses'] });
      // Le message de succès est affiché directement dans l'UI
    },
    onError: (error: any) => {
      setCreateError(error.response?.data?.detail || 'Erreur lors de la génération de la licence');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      pharmacy_id: formData.pharmacy_id ? parseInt(formData.pharmacy_id) : null,
      max_activations: formData.max_activations,
      expires_at: formData.expires_at || null,
      customer_name: formData.customer_name || null,
      customer_email: formData.customer_email || null,
      customer_phone: formData.customer_phone || null,
      notes: formData.notes || null,
    };
    createMutation.mutate(data);
  };

  const handleClose = () => {
    setFormData({
      pharmacy_id: '',
      max_activations: 2,
      expires_at: '',
      customer_name: '',
      customer_email: '',
      customer_phone: '',
      notes: '',
    });
    setGeneratedKey(null);
    setCreateError(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Générer une licence" size="lg">
      {/* Affichage des erreurs */}
      {createError && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <AlertCircle className="h-4 w-4 text-red-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">{createError}</p>
          </div>
          <button
            type="button"
            onClick={() => setCreateError(null)}
            className="flex-shrink-0 p-1 hover:bg-red-100 rounded-lg transition-colors"
          >
            <X className="h-4 w-4 text-red-500" />
          </button>
        </div>
      )}
      
      {generatedKey ? (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <p className="font-semibold text-green-900">Licence générée avec succès !</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <p className="text-sm text-gray-600 mb-2">Clé de licence :</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 font-mono text-lg font-bold text-gray-900 bg-gray-50 px-4 py-2 rounded border">
                  {generatedKey}
                </code>
                <button
                  onClick={handleCopyGeneratedKey}
                  className={clsx(
                    "p-2 rounded-lg transition-all",
                    keyCopied 
                      ? "bg-emerald-100 text-emerald-600" 
                      : "hover:bg-gray-100 text-gray-600"
                  )}
                  title={keyCopied ? "Copié !" : "Copier"}
                >
                  {keyCopied ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <Copy className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-600 mt-3">
              ⚠️ Copiez cette clé et partagez-la avec votre client. Elle ne sera plus affichée après la fermeture de cette fenêtre.
            </p>
          </div>
          <div className="flex justify-end">
            <button onClick={handleClose} className="btn-primary">
              Fermer
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Commerce (optionnel)</label>
              <select
                value={formData.pharmacy_id}
                onChange={(e) => setFormData({ ...formData, pharmacy_id: e.target.value })}
                className="input"
              >
                <option value="">Aucun commerce</option>
                {businesses?.map((business: any) => (
                  <option key={business.id} value={business.id}>
                    {business.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Nombre max d'activations</label>
              <input
                type="number"
                value={formData.max_activations}
                onChange={(e) => setFormData({ ...formData, max_activations: parseInt(e.target.value) || 2 })}
                className="input"
                min="1"
                max="10"
              />
            </div>
            <div>
              <label className="label">Date d'expiration (optionnel)</label>
              <input
                type="date"
                value={formData.expires_at}
                onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">Nom du client</label>
              <input
                type="text"
                value={formData.customer_name}
                onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                className="input"
                placeholder="Nom du client"
              />
            </div>
            <div>
              <label className="label">Email du client</label>
              <input
                type="email"
                value={formData.customer_email}
                onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                className="input"
                placeholder="email@example.com"
              />
            </div>
            <div>
              <label className="label">Téléphone du client</label>
              <input
                type="text"
                value={formData.customer_phone}
                onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                className="input"
                placeholder="+224 XXX XXX XXX"
              />
            </div>
          </div>
          <div>
            <label className="label">Notes (optionnel)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="input"
              rows={3}
              placeholder="Notes internes..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={handleClose} className="btn-secondary">
              Annuler
            </button>
            <button type="submit" disabled={createMutation.isPending} className="btn-primary">
              {createMutation.isPending ? 'Génération...' : 'Générer la licence'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

// License Detail Modal
function LicenseDetailModal({ isOpen, onClose, license }: { isOpen: boolean; onClose: () => void; license: any }) {
  const [detailKeyCopied, setDetailKeyCopied] = useState(false);

  const handleCopyDetailKey = () => {
    if (license?.license_key) {
      navigator.clipboard.writeText(license.license_key);
      setDetailKeyCopied(true);
      setTimeout(() => setDetailKeyCopied(false), 2000);
    }
  };

  if (!license) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Détails de la licence" size="lg">
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500 mb-1">Clé de licence</p>
            <div className="flex items-center gap-2">
              <code className="font-mono font-semibold text-gray-900">{license.license_key}</code>
              <button
                onClick={handleCopyDetailKey}
                className={clsx(
                  "p-1 rounded transition-all",
                  detailKeyCopied 
                    ? "bg-emerald-100 text-emerald-600" 
                    : "hover:bg-gray-100 text-gray-600"
                )}
              >
                {detailKeyCopied ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Statut</p>
            <span className={clsx(
              'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium',
              license.status === 'active' ? 'bg-green-100 text-green-800' :
              license.status === 'expired' ? 'bg-red-100 text-red-800' :
              license.status === 'revoked' ? 'bg-gray-100 text-gray-800' :
              'bg-yellow-100 text-yellow-800'
            )}>
              {license.status === 'active' ? 'Active' :
              license.status === 'expired' ? 'Expirée' :
              license.status === 'revoked' ? 'Révoquée' :
              'Suspendue'}
            </span>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Client</p>
            <p className="font-medium text-gray-900">{license.customer_name || 'N/A'}</p>
            {license.customer_email && (
              <p className="text-sm text-gray-500">{license.customer_email}</p>
            )}
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Activations</p>
            <p className="font-medium text-gray-900">
              {license.activations?.filter((a: any) => a.is_active).length || 0} / {license.max_activations}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Date d'expiration</p>
            <p className="font-medium text-gray-900">
              {license.expires_at ? new Date(license.expires_at).toLocaleDateString('fr-FR') : 'Jamais'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Créée le</p>
            <p className="font-medium text-gray-900">
              {new Date(license.created_at).toLocaleDateString('fr-FR')}
            </p>
          </div>
        </div>

        {license.activations && license.activations.length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">Activations</p>
            <div className="space-y-2">
              {license.activations.map((activation: any) => (
                <div key={activation.id} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{activation.machine_name || 'Machine inconnue'}</p>
                      <p className="text-xs text-gray-500">{activation.os_info || 'OS inconnu'}</p>
                      <p className="text-xs text-gray-400 font-mono mt-1">ID: {activation.hardware_id.substring(0, 20)}...</p>
                    </div>
                    <span className={clsx(
                      'px-2 py-1 rounded text-xs font-medium',
                      activation.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    )}>
                      {activation.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Activée le: {new Date(activation.activated_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end pt-4 border-t">
          <button onClick={onClose} className="btn-primary">
            Fermer
          </button>
        </div>
      </div>
    </Modal>
  );
}

