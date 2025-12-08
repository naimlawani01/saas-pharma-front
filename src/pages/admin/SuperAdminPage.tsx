import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { 
  Building2,
  Users,
  Package,
  TrendingUp,
  Plus,
  Search,
  RefreshCw,
  Trash2,
  Power,
  Eye,
  ChevronRight,
  ShieldCheck,
  DollarSign,
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { Loader2 } from 'lucide-react';

interface DashboardStats {
  total_pharmacies: number;
  active_pharmacies: number;
  total_users: number;
  total_products: number;
  total_sales: number;
  total_customers: number;
  pharmacies_this_month: number;
  sales_this_month: number;
}

interface Pharmacy {
  id: number;
  name: string;
  address: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  license_number: string | null;
  is_active: boolean;
  created_at: string;
  users_count: number;
  products_count: number;
  customers_count: number;
  sales_count: number;
  total_sales: number;
}

export default function SuperAdminPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState<boolean | null>(null);
  
  // Modal states
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [pharmacyToDelete, setPharmacyToDelete] = useState<Pharmacy | null>(null);
  const [selectedPharmacy, setSelectedPharmacy] = useState<Pharmacy | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Rediriger si pas super admin
  useEffect(() => {
    if (user && !user.is_superuser) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  // Vérifier si l'utilisateur est super admin
  if (!user?.is_superuser) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <ShieldCheck className="w-16 h-16 mb-4 text-gray-300" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Accès restreint</h2>
        <p>Cette page est réservée aux super administrateurs.</p>
        <p className="text-sm mt-2">Redirection en cours...</p>
      </div>
    );
  }

  // Récupérer les stats du dashboard
  const { data: stats } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: async () => {
      const response = await api.get('/admin/dashboard');
      return response.data as DashboardStats;
    },
  });

  // Récupérer les pharmacies
  const { data: pharmacies, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin-pharmacies', search, filterActive],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (filterActive !== null) params.append('is_active', String(filterActive));
      const response = await api.get(`/admin/pharmacies?${params}`);
      return response.data as Pharmacy[];
    },
  });

  // Toggle activation
  const toggleMutation = useMutation({
    mutationFn: async (pharmacyId: number) => {
      return api.patch(`/admin/pharmacies/${pharmacyId}/toggle`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pharmacies'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
      toast.success('Statut mis à jour');
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour');
    },
  });

  // Delete
  const deleteMutation = useMutation({
    mutationFn: async (pharmacyId: number) => {
      return api.delete(`/admin/pharmacies/${pharmacyId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pharmacies'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
      toast.success('Pharmacie supprimée');
      setShowDeleteDialog(false);
      setPharmacyToDelete(null);
    },
    onError: () => {
      toast.error('Erreur lors de la suppression');
    },
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-GN').format(value) + ' GNF';
  };

  const handleViewDetail = (pharmacy: Pharmacy) => {
    setSelectedPharmacy(pharmacy);
    setShowDetailModal(true);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-purple-600" />
            Super Admin
          </h1>
          <p className="text-gray-500">Gestion globale du système</p>
        </div>
        <button 
          onClick={() => setShowOnboardingModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Nouvelle Pharmacie
        </button>
      </div>

      {/* Dashboard Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Pharmacies</p>
              <p className="text-3xl font-bold">{stats?.total_pharmacies || 0}</p>
              <p className="text-purple-200 text-xs">{stats?.active_pharmacies || 0} actives</p>
            </div>
            <Building2 className="w-12 h-12 text-purple-300" />
          </div>
        </div>

        <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Utilisateurs</p>
              <p className="text-3xl font-bold">{stats?.total_users || 0}</p>
            </div>
            <Users className="w-12 h-12 text-blue-300" />
          </div>
        </div>

        <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Ventes totales</p>
              <p className="text-2xl font-bold">{formatCurrency(stats?.total_sales || 0)}</p>
              <p className="text-green-200 text-xs">Ce mois: {formatCurrency(stats?.sales_this_month || 0)}</p>
            </div>
            <DollarSign className="w-12 h-12 text-green-300" />
          </div>
        </div>

        <div className="card bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm">Produits</p>
              <p className="text-3xl font-bold">{stats?.total_products || 0}</p>
              <p className="text-orange-200 text-xs">{stats?.total_customers || 0} clients</p>
            </div>
            <Package className="w-12 h-12 text-orange-300" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher une pharmacie..."
              className="input pl-10"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilterActive(null)}
              className={clsx('btn', filterActive === null ? 'btn-primary' : 'btn-secondary')}
            >
              Toutes
            </button>
            <button
              onClick={() => setFilterActive(true)}
              className={clsx('btn', filterActive === true ? 'btn-primary' : 'btn-secondary')}
            >
              Actives
            </button>
            <button
              onClick={() => setFilterActive(false)}
              className={clsx('btn', filterActive === false ? 'btn-primary' : 'btn-secondary')}
            >
              Inactives
            </button>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw className={clsx('w-5 h-5', isFetching && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Pharmacies List */}
      <div className="card overflow-hidden p-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : pharmacies && pharmacies.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr className="text-left text-sm text-gray-500">
                  <th className="px-6 py-4 font-medium">Pharmacie</th>
                  <th className="px-6 py-4 font-medium">Utilisateurs</th>
                  <th className="px-6 py-4 font-medium">Produits</th>
                  <th className="px-6 py-4 font-medium">Ventes</th>
                  <th className="px-6 py-4 font-medium">Statut</th>
                  <th className="px-6 py-4 font-medium w-40">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pharmacies.map((pharmacy) => (
                  <tr key={pharmacy.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{pharmacy.name}</p>
                          <p className="text-sm text-gray-500">{pharmacy.city || 'N/A'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="badge bg-blue-100 text-blue-800">
                        {pharmacy.users_count} utilisateur(s)
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-600">{pharmacy.products_count} produits</span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{formatCurrency(pharmacy.total_sales)}</p>
                        <p className="text-xs text-gray-500">{pharmacy.sales_count} vente(s)</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleMutation.mutate(pharmacy.id)}
                        className={clsx(
                          'badge flex items-center gap-1 cursor-pointer hover:opacity-80',
                          pharmacy.is_active ? 'badge-success' : 'badge-danger'
                        )}
                      >
                        <Power className="w-3 h-3" />
                        {pharmacy.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleViewDetail(pharmacy)}
                          className="p-2 hover:bg-gray-100 rounded-lg"
                          title="Voir détails"
                        >
                          <Eye className="w-4 h-4 text-gray-500" />
                        </button>
                        <button
                          onClick={() => {
                            setPharmacyToDelete(pharmacy);
                            setShowDeleteDialog(true);
                          }}
                          className="p-2 hover:bg-red-50 rounded-lg"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <Building2 className="w-12 h-12 mb-4 text-gray-300" />
            <p>Aucune pharmacie trouvée</p>
            <button onClick={() => setShowOnboardingModal(true)} className="mt-4 btn-primary">
              Créer une pharmacie
            </button>
          </div>
        )}
      </div>

      {/* Onboarding Modal */}
      <OnboardingModal
        isOpen={showOnboardingModal}
        onClose={() => setShowOnboardingModal(false)}
      />

      {/* Detail Modal */}
      <PharmacyDetailModal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedPharmacy(null);
        }}
        pharmacy={selectedPharmacy}
      />

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false);
          setPharmacyToDelete(null);
        }}
        onConfirm={() => pharmacyToDelete && deleteMutation.mutate(pharmacyToDelete.id)}
        title="Supprimer la pharmacie"
        message={`Êtes-vous sûr de vouloir supprimer "${pharmacyToDelete?.name}" ? Cette action est irréversible et supprimera toutes les données associées.`}
        confirmText="Supprimer définitivement"
        type="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}

// Onboarding Modal
function OnboardingModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    // Pharmacie
    pharmacy_name: '',
    pharmacy_address: '',
    pharmacy_city: '',
    pharmacy_phone: '',
    pharmacy_email: '',
    license_number: '',
    // Admin
    admin_email: '',
    admin_username: '',
    admin_password: '',
    admin_full_name: '',
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      return api.post('/admin/pharmacies/onboarding', formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pharmacies'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
      toast.success('Pharmacie créée avec succès !');
      onClose();
      setStep(1);
      setFormData({
        pharmacy_name: '',
        pharmacy_address: '',
        pharmacy_city: '',
        pharmacy_phone: '',
        pharmacy_email: '',
        license_number: '',
        admin_email: '',
        admin_username: '',
        admin_password: '',
        admin_full_name: '',
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Erreur lors de la création');
    },
  });

  const handleSubmit = () => {
    if (step === 1) {
      if (!formData.pharmacy_name) {
        toast.error('Le nom de la pharmacie est requis');
        return;
      }
      setStep(2);
    } else {
      if (!formData.admin_email || !formData.admin_username || !formData.admin_password) {
        toast.error('Email, nom d\'utilisateur et mot de passe sont requis');
        return;
      }
      createMutation.mutate();
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={step === 1 ? '1/2 - Informations Pharmacie' : '2/2 - Administrateur'}
      size="md"
    >
      <div className="space-y-4">
        {step === 1 ? (
          <>
            <div>
              <label className="label">Nom de la pharmacie *</label>
              <input
                type="text"
                value={formData.pharmacy_name}
                onChange={(e) => setFormData({ ...formData, pharmacy_name: e.target.value })}
                className="input"
                placeholder="Pharmacie Centrale"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Ville</label>
                <input
                  type="text"
                  value={formData.pharmacy_city}
                  onChange={(e) => setFormData({ ...formData, pharmacy_city: e.target.value })}
                  className="input"
                  placeholder="Conakry"
                />
              </div>
              <div>
                <label className="label">Téléphone</label>
                <input
                  type="text"
                  value={formData.pharmacy_phone}
                  onChange={(e) => setFormData({ ...formData, pharmacy_phone: e.target.value })}
                  className="input"
                  placeholder="+224 620 00 00 00"
                />
              </div>
            </div>
            <div>
              <label className="label">Adresse</label>
              <input
                type="text"
                value={formData.pharmacy_address}
                onChange={(e) => setFormData({ ...formData, pharmacy_address: e.target.value })}
                className="input"
                placeholder="Rue de la République"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  value={formData.pharmacy_email}
                  onChange={(e) => setFormData({ ...formData, pharmacy_email: e.target.value })}
                  className="input"
                  placeholder="contact@pharmacie.gn"
                />
              </div>
              <div>
                <label className="label">N° Licence</label>
                <input
                  type="text"
                  value={formData.license_number}
                  onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                  className="input"
                  placeholder="PH-GN-001"
                />
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="p-3 bg-purple-50 rounded-lg mb-4">
              <p className="text-sm text-purple-700">
                <strong>Pharmacie:</strong> {formData.pharmacy_name}
              </p>
            </div>
            <div>
              <label className="label">Nom complet</label>
              <input
                type="text"
                value={formData.admin_full_name}
                onChange={(e) => setFormData({ ...formData, admin_full_name: e.target.value })}
                className="input"
                placeholder="Dr. Jean Dupont"
              />
            </div>
            <div>
              <label className="label">Email *</label>
              <input
                type="email"
                value={formData.admin_email}
                onChange={(e) => setFormData({ ...formData, admin_email: e.target.value })}
                className="input"
                placeholder="admin@pharmacie.gn"
              />
            </div>
            <div>
              <label className="label">Nom d'utilisateur *</label>
              <input
                type="text"
                value={formData.admin_username}
                onChange={(e) => setFormData({ ...formData, admin_username: e.target.value })}
                className="input"
                placeholder="admin_centrale"
              />
            </div>
            <div>
              <label className="label">Mot de passe *</label>
              <input
                type="password"
                value={formData.admin_password}
                onChange={(e) => setFormData({ ...formData, admin_password: e.target.value })}
                className="input"
                placeholder="••••••••"
              />
            </div>
          </>
        )}

        <div className="flex justify-between pt-4 border-t">
          {step === 2 ? (
            <button onClick={() => setStep(1)} className="btn-secondary">
              Retour
            </button>
          ) : (
            <button onClick={onClose} className="btn-secondary">
              Annuler
            </button>
          )}
          <button 
            onClick={handleSubmit}
            disabled={createMutation.isPending}
            className="btn-primary flex items-center gap-2"
          >
            {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {step === 1 ? 'Suivant' : 'Créer la pharmacie'}
            {step === 1 && <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// Pharmacy Detail Modal
function PharmacyDetailModal({ 
  isOpen, 
  onClose, 
  pharmacy 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  pharmacy: Pharmacy | null;
}) {
  const { data: users } = useQuery({
    queryKey: ['pharmacy-users', pharmacy?.id],
    queryFn: async () => {
      const response = await api.get(`/admin/pharmacies/${pharmacy?.id}/users`);
      return response.data;
    },
    enabled: isOpen && !!pharmacy?.id,
  });

  if (!pharmacy) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-GN').format(value) + ' GNF';
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={pharmacy.name} size="lg">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-purple-50 p-4 rounded-xl text-center">
            <Users className="w-6 h-6 text-purple-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-purple-800">{pharmacy.users_count}</p>
            <p className="text-xs text-purple-600">Utilisateurs</p>
          </div>
          <div className="bg-blue-50 p-4 rounded-xl text-center">
            <Package className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-blue-800">{pharmacy.products_count}</p>
            <p className="text-xs text-blue-600">Produits</p>
          </div>
          <div className="bg-green-50 p-4 rounded-xl text-center">
            <TrendingUp className="w-6 h-6 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-green-800">{pharmacy.sales_count}</p>
            <p className="text-xs text-green-600">Ventes</p>
          </div>
          <div className="bg-orange-50 p-4 rounded-xl text-center">
            <DollarSign className="w-6 h-6 text-orange-600 mx-auto mb-2" />
            <p className="text-lg font-bold text-orange-800">{formatCurrency(pharmacy.total_sales)}</p>
            <p className="text-xs text-orange-600">CA Total</p>
          </div>
        </div>

        {/* Info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">Adresse</h4>
            <p className="text-gray-900">{pharmacy.address || 'N/A'}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">Ville</h4>
            <p className="text-gray-900">{pharmacy.city || 'N/A'}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">Téléphone</h4>
            <p className="text-gray-900">{pharmacy.phone || 'N/A'}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">Email</h4>
            <p className="text-gray-900">{pharmacy.email || 'N/A'}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">N° Licence</h4>
            <p className="text-gray-900">{pharmacy.license_number || 'N/A'}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">Créée le</h4>
            <p className="text-gray-900">
              {new Date(pharmacy.created_at).toLocaleDateString('fr-FR')}
            </p>
          </div>
        </div>

        {/* Users */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Utilisateurs ({users?.length || 0})</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {users?.map((user: any) => (
              <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-primary-700">
                      {user.full_name?.[0] || user.username[0].toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{user.full_name || user.username}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                </div>
                <span className={clsx(
                  'badge text-xs',
                  user.role === 'admin' ? 'bg-red-100 text-red-800' :
                  user.role === 'pharmacist' ? 'bg-blue-100 text-blue-800' :
                  'bg-green-100 text-green-800'
                )}>
                  {user.role === 'admin' ? 'Admin' : user.role === 'pharmacist' ? 'Pharmacien' : 'Assistant'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <button onClick={onClose} className="btn-secondary">
            Fermer
          </button>
        </div>
      </div>
    </Modal>
  );
}

