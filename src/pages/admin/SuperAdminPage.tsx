import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { BUSINESS_TYPES } from '@/config/businessConfig';
import { 
  Users,
  Package,
  TrendingUp,
  Plus,
  Search,
  RefreshCw,
  Trash2,
  Power,
  Eye,
  Edit,
  ChevronRight,
  ShieldCheck,
  DollarSign,
  Upload,
  FileSpreadsheet,
  X,
  Loader2,
  Store,
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

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

interface Business {
  id: number;
  name: string;
  address: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  license_number: string | null;
  business_type: string;
  is_active: boolean;
  created_at: string;
  users_count: number;
  products_count: number;
  customers_count: number;
  sales_count: number;
  total_sales: number;
}

// Helper pour obtenir le label du type d'activité
const getBusinessTypeLabel = (type: string): string => {
  const businessType = BUSINESS_TYPES.find(bt => bt.id === type);
  return businessType?.name || 'Commerce';
};

// Helper pour obtenir l'icône du type d'activité
const getBusinessTypeIcon = (type: string): string => {
  const businessType = BUSINESS_TYPES.find(bt => bt.id === type);
  return businessType?.icon || '🏪';
};

export default function SuperAdminPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState<boolean | null>(null);
  const [filterBusinessType, setFilterBusinessType] = useState<string | null>(null);
  
  // Modal states
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [businessToDelete, setBusinessToDelete] = useState<Business | null>(null);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [businessToEdit, setBusinessToEdit] = useState<Business | null>(null);

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

  // Récupérer les commerces
  const { data: businesses, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin-pharmacies', search, filterActive, filterBusinessType],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (filterActive !== null) params.append('is_active', String(filterActive));
      if (filterBusinessType) params.append('business_type', filterBusinessType);
      const response = await api.get(`/admin/pharmacies?${params}`);
      return response.data as Business[];
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
    mutationFn: async (businessId: number) => {
      return api.delete(`/admin/pharmacies/${businessId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pharmacies'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
      toast.success('Commerce supprimé');
      setShowDeleteDialog(false);
      setBusinessToDelete(null);
    },
    onError: () => {
      toast.error('Erreur lors de la suppression');
    },
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-GN').format(value) + ' GNF';
  };

  const handleViewDetail = (business: Business) => {
    setSelectedBusiness(business);
    setShowDetailModal(true);
  };

  const handleEditBusiness = (business: Business) => {
    setBusinessToEdit(business);
    setShowEditModal(true);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header avec design amélioré */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <ShieldCheck className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-display font-bold">Super Admin</h1>
                <p className="text-purple-100 text-sm">Gestion globale des commerces</p>
              </div>
            </div>
          </div>
          <button 
            onClick={() => setShowOnboardingModal(true)}
            className="bg-white text-purple-600 hover:bg-purple-50 px-6 py-3 rounded-xl font-semibold flex items-center gap-2 shadow-lg transition-all hover:scale-105"
          >
            <Plus className="w-5 h-5" />
            Nouveau Commerce
          </button>
        </div>
      </div>

      {/* Dashboard Stats - Design amélioré */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden group">
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <Store className="w-10 h-10 text-purple-200 group-hover:scale-110 transition-transform" />
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                <Store className="w-6 h-6" />
              </div>
            </div>
            <p className="text-purple-100 text-sm font-medium mb-1">Commerces</p>
            <p className="text-4xl font-bold">{stats?.total_pharmacies || 0}</p>
            <p className="text-purple-200 text-xs mt-2">{stats?.active_pharmacies || 0} actif(s)</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden group">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <Users className="w-10 h-10 text-blue-200 group-hover:scale-110 transition-transform" />
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
            </div>
            <p className="text-blue-100 text-sm font-medium mb-1">Utilisateurs</p>
            <p className="text-4xl font-bold">{stats?.total_users || 0}</p>
            <p className="text-blue-200 text-xs mt-2">Total système</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden group">
          <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <DollarSign className="w-10 h-10 text-green-200 group-hover:scale-110 transition-transform" />
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>
            <p className="text-green-100 text-sm font-medium mb-1">Ventes totales</p>
            <p className="text-2xl font-bold">{formatCurrency(stats?.total_sales || 0)}</p>
            <p className="text-green-200 text-xs mt-2">Ce mois: {formatCurrency(stats?.sales_this_month || 0)}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden group">
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <Package className="w-10 h-10 text-orange-200 group-hover:scale-110 transition-transform" />
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6" />
              </div>
            </div>
            <p className="text-orange-100 text-sm font-medium mb-1">Produits</p>
            <p className="text-4xl font-bold">{stats?.total_products || 0}</p>
            <p className="text-orange-200 text-xs mt-2">{stats?.total_customers || 0} clients</p>
          </div>
        </div>
      </div>

      {/* Filters - Design amélioré */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4">
        <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un commerce..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilterActive(null)}
              className={clsx(
                'px-4 py-2.5 rounded-lg font-medium transition-all',
                filterActive === null 
                  ? 'bg-purple-600 text-white shadow-md' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              )}
            >
                Tous
            </button>
            <button
              onClick={() => setFilterActive(true)}
              className={clsx(
                'px-4 py-2.5 rounded-lg font-medium transition-all',
                filterActive === true 
                  ? 'bg-green-600 text-white shadow-md' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              )}
            >
                Actifs
            </button>
            <button
              onClick={() => setFilterActive(false)}
              className={clsx(
                'px-4 py-2.5 rounded-lg font-medium transition-all',
                filterActive === false 
                  ? 'bg-red-600 text-white shadow-md' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              )}
            >
                Inactifs
            </button>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <RefreshCw className={clsx('w-5 h-5', isFetching && 'animate-spin')} />
            Actualiser
          </button>
          </div>
          
          {/* Filtre par type d'activité */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterBusinessType(null)}
              className={clsx(
                'px-3 py-1.5 rounded-full text-sm font-medium transition-all',
                filterBusinessType === null 
                  ? 'bg-purple-100 text-purple-700 ring-2 ring-purple-500' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              Tous types
            </button>
            {BUSINESS_TYPES.map((type) => (
              <button
                key={type.id}
                onClick={() => setFilterBusinessType(type.id)}
                className={clsx(
                  'px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1',
                  filterBusinessType === type.id 
                    ? 'bg-purple-100 text-purple-700 ring-2 ring-purple-500' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                <span>{type.icon}</span>
                {type.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Commerces List - Design amélioré */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        ) : businesses && businesses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-purple-50 to-purple-100">
                <tr className="text-left text-sm">
                  <th className="px-6 py-4 font-semibold text-gray-700">Commerce</th>
                  <th className="px-6 py-4 font-semibold text-gray-700">Type</th>
                  <th className="px-6 py-4 font-semibold text-gray-700">Utilisateurs</th>
                  <th className="px-6 py-4 font-semibold text-gray-700">Produits</th>
                  <th className="px-6 py-4 font-semibold text-gray-700">Ventes</th>
                  <th className="px-6 py-4 font-semibold text-gray-700">Statut</th>
                  <th className="px-6 py-4 font-semibold text-gray-700 w-40">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {businesses.map((business) => (
                  <tr key={business.id} className="hover:bg-purple-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md text-2xl">
                          {getBusinessTypeIcon(business.business_type)}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{business.name}</p>
                          <p className="text-sm text-gray-500">{business.city || 'N/A'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        {getBusinessTypeIcon(business.business_type)} {getBusinessTypeLabel(business.business_type)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                        {business.users_count} utilisateur(s)
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-700 font-medium">{business.products_count} produits</span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-gray-900">{formatCurrency(business.total_sales)}</p>
                        <p className="text-xs text-gray-500">{business.sales_count} vente(s)</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleMutation.mutate(business.id)}
                        className={clsx(
                          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all hover:scale-105',
                          business.is_active 
                            ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                            : 'bg-red-100 text-red-800 hover:bg-red-200'
                        )}
                      >
                        <Power className={clsx('w-3.5 h-3.5', business.is_active ? 'text-green-600' : 'text-red-600')} />
                        {business.is_active ? 'Actif' : 'Inactif'}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewDetail(business)}
                          className="p-2 hover:bg-purple-100 rounded-lg transition-colors"
                          title="Voir détails"
                        >
                          <Eye className="w-5 h-5 text-purple-600" />
                        </button>
                        <button
                          onClick={() => handleEditBusiness(business)}
                          className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                          title="Modifier"
                        >
                          <Edit className="w-5 h-5 text-blue-600" />
                        </button>
                        <button
                          onClick={() => {
                            setBusinessToDelete(business);
                            setShowDeleteDialog(true);
                          }}
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-5 h-5 text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500 p-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Store className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-lg font-medium text-gray-700 mb-2">Aucun commerce trouvé</p>
            <p className="text-sm text-gray-500 mb-4">Commencez par créer votre premier commerce</p>
            <button 
              onClick={() => setShowOnboardingModal(true)} 
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 shadow-md transition-all hover:scale-105"
            >
              <Plus className="w-5 h-5" />
              Créer un commerce
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
      <BusinessDetailModal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedBusiness(null);
        }}
        business={selectedBusiness}
        onEdit={(business) => {
          setShowDetailModal(false);
          setSelectedBusiness(null);
          setBusinessToEdit(business);
          setShowEditModal(true);
        }}
      />

      {/* Edit Modal */}
      <BusinessEditModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setBusinessToEdit(null);
        }}
        business={businessToEdit}
      />

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false);
          setBusinessToDelete(null);
        }}
        onConfirm={() => businessToDelete && deleteMutation.mutate(businessToDelete.id)}
        title="Supprimer le commerce"
        message={`Êtes-vous sûr de vouloir supprimer "${businessToDelete?.name}" ? Cette action est irréversible et supprimera toutes les données associées.`}
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
  const [createdBusinessId, setCreatedBusinessId] = useState<number | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    // Commerce
    pharmacy_name: '',
    pharmacy_address: '',
    pharmacy_city: '',
    pharmacy_phone: '',
    pharmacy_email: '',
    license_number: '',
    business_type: 'general', // Nouveau champ
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
    onSuccess: (response) => {
      console.log('Commerce créé, réponse complète:', response);
      console.log('Response data:', response.data);
      const businessId = response.data?.id;
      
      if (!businessId) {
        console.error('ID de commerce manquant dans la réponse:', response.data);
        toast.error('Erreur: ID de commerce manquant');
        return;
      }
      
      setCreatedBusinessId(businessId);
      
      // Toujours passer à l'étape 4 pour permettre l'import de produits
      // Ne pas fermer le modal, juste changer l'étape
      console.log('Passage à l\'étape 4, businessId:', businessId);
      setStep(4);
      toast.success('Commerce créé avec succès ! Vous pouvez maintenant importer des produits.');
      
      // Invalider les queries après le changement d'étape pour éviter de fermer le modal
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['admin-pharmacies'] });
        queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
      }, 500);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Erreur lors de la création');
    },
  });

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return api.post(`/admin/pharmacies/${createdBusinessId}/products/import`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    },
    onSuccess: (response) => {
      const { created, errors } = response.data;
      if (errors > 0) {
        toast.success(`${created} produit(s) importé(s), ${errors} erreur(s)`);
      } else {
        toast.success(`${created} produit(s) importé(s) avec succès !`);
      }
      queryClient.invalidateQueries({ queryKey: ['admin-pharmacies'] });
      handleClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'import des produits');
    },
  });

  const handleClose = () => {
    onClose();
    setStep(1);
    setCreatedBusinessId(null);
    setSelectedFile(null);
    setFormData({
      pharmacy_name: '',
      pharmacy_address: '',
      pharmacy_city: '',
      pharmacy_phone: '',
      pharmacy_email: '',
      license_number: '',
      business_type: 'general',
      admin_email: '',
      admin_username: '',
      admin_password: '',
      admin_full_name: '',
    });
  };

  const handleSubmit = () => {
    if (step === 1) {
      // Étape 1: Type d'activité
      if (!formData.business_type) {
        toast.error('Sélectionnez un type d\'activité');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      // Étape 2: Infos commerce
      if (!formData.pharmacy_name) {
        toast.error('Le nom du commerce est requis');
        return;
      }
      setStep(3);
    } else if (step === 3) {
      // Étape 3: Admin
      if (!formData.admin_email || !formData.admin_username || !formData.admin_password) {
        toast.error('Email, nom d\'utilisateur et mot de passe sont requis');
        return;
      }
      createMutation.mutate();
    } else if (step === 4) {
      // Étape 4 : Import de produits
      if (selectedFile) {
        importMutation.mutate(selectedFile);
      } else {
        // Pas de fichier, terminer
        toast.success('Commerce créé avec succès !');
        handleClose();
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (extension && ['xlsx', 'xls', 'csv'].includes(extension)) {
        setSelectedFile(file);
      } else {
        toast.error('Format de fichier non supporté. Utilisez .xlsx, .xls ou .csv');
      }
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title={
        step === 1 ? '1/4 - Type d\'activité' : 
        step === 2 ? '2/4 - Informations Commerce' : 
        step === 3 ? '3/4 - Administrateur' :
        '4/4 - Import Produits (Optionnel)'
      }
      size="md"
    >
      <div className="space-y-4">
        {/* Debug: Afficher l'étape actuelle */}
        {process.env.NODE_ENV === 'development' && (
          <div className="text-xs text-gray-400">Étape actuelle: {step} | Business ID: {createdBusinessId || 'null'}</div>
        )}
        {step === 1 ? (
          <>
            {/* Étape 1: Sélection du type d'activité */}
            <div>
              <label className="label">Type d'activité *</label>
              <p className="text-sm text-gray-500 mb-4">Sélectionnez le type de commerce à créer</p>
              <div className="grid grid-cols-2 gap-3 max-h-80 overflow-y-auto">
                {BUSINESS_TYPES.map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, business_type: type.id })}
                    className={clsx(
                      'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center',
                      formData.business_type === type.id
                        ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-200'
                        : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50/50'
                    )}
                  >
                    <span className="text-3xl">{type.icon}</span>
                    <span className="font-medium text-sm text-gray-900">{type.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : step === 2 ? (
          <>
            {/* Étape 2: Informations du commerce */}
            <div className="p-3 bg-purple-50 rounded-lg mb-4">
              <p className="text-sm text-purple-700">
                <strong>Type:</strong> {getBusinessTypeIcon(formData.business_type)} {getBusinessTypeLabel(formData.business_type)}
              </p>
            </div>
            <div>
              <label className="label">Nom du commerce *</label>
              <input
                type="text"
                value={formData.pharmacy_name}
                onChange={(e) => setFormData({ ...formData, pharmacy_name: e.target.value })}
                className="input"
                placeholder="Mon Commerce"
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
                  placeholder="contact@commerce.gn"
                />
              </div>
              <div>
                <label className="label">N° Registre / Licence</label>
                <input
                  type="text"
                  value={formData.license_number}
                  onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                  className="input"
                  placeholder="RC-GN-001"
                />
              </div>
            </div>
          </>
        ) : step === 3 ? (
          <>
            <div className="p-3 bg-purple-50 rounded-lg mb-4">
              <p className="text-sm text-purple-700">
                <strong>{getBusinessTypeIcon(formData.business_type)} {formData.pharmacy_name}</strong>
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
        ) : step === 4 ? (
          <>
            <div className="p-3 bg-blue-50 rounded-lg mb-4">
              <p className="text-sm text-blue-700">
                <strong>Commerce créé:</strong> {getBusinessTypeIcon(formData.business_type)} {formData.pharmacy_name}
              </p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="label">Importer des produits depuis un fichier (Optionnel)</label>
                <p className="text-xs text-gray-500 mb-3">
                  Formats supportés: Excel (.xlsx, .xls) ou CSV
                </p>
                
                {!selectedFile ? (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-2 text-gray-400" />
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold">Cliquez pour télécharger</span> ou glissez-déposez
                      </p>
                      <p className="text-xs text-gray-500">Excel ou CSV</p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </label>
                ) : (
                  <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileSpreadsheet className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="text-sm font-medium text-green-900">{selectedFile.name}</p>
                        <p className="text-xs text-green-600">
                          {(selectedFile.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedFile(null)}
                      className="p-1 hover:bg-green-100 rounded"
                    >
                      <X className="w-4 h-4 text-green-600" />
                    </button>
                  </div>
                )}
              </div>

              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs font-medium text-gray-700 mb-2">Colonnes attendues dans le fichier:</p>
                <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
                  <li><strong>nom</strong> (requis) - Nom du produit</li>
                  <li><strong>prix_achat</strong> (requis) - Prix d'achat</li>
                  <li><strong>prix_vente</strong> (requis) - Prix de vente</li>
                  <li>description, code_barres, sku, quantite, quantite_min, unite, date_fabrication, date_expiration, ordonnance_requise (optionnels)</li>
                </ul>
              </div>
            </div>
          </>
        ) : null}

        <div className="flex justify-between pt-4 border-t">
          {step === 2 || step === 3 ? (
            <button onClick={() => setStep(step - 1)} className="btn-secondary">
              Retour
            </button>
          ) : step === 4 ? (
            <button onClick={() => {
              // Passer à l'étape suivante sans fichier
              handleClose();
            }} className="btn-secondary">
              Passer cette étape
            </button>
          ) : (
            <button onClick={handleClose} className="btn-secondary">
              Annuler
            </button>
          )}
          <button 
            onClick={handleSubmit}
            disabled={createMutation.isPending || importMutation.isPending}
            className="btn-primary flex items-center gap-2"
          >
            {(createMutation.isPending || importMutation.isPending) && <Loader2 className="w-4 h-4 animate-spin" />}
            {step === 1 || step === 2 ? 'Suivant' : step === 3 ? 'Créer le commerce' : 'Importer et terminer'}
            {(step === 1 || step === 2) && <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// Business Detail Modal
function BusinessDetailModal({ 
  isOpen, 
  onClose, 
  business,
  onEdit,
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  business: Business | null;
  onEdit?: (business: Business) => void;
}) {
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showImportSection, setShowImportSection] = useState(false);

  const { data: users } = useQuery({
    queryKey: ['pharmacy-users', business?.id],
    queryFn: async () => {
      const response = await api.get(`/admin/pharmacies/${business?.id}/users`);
      return response.data;
    },
    enabled: isOpen && !!business?.id,
  });

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!business?.id) {
        throw new Error("Business ID is missing for product import.");
      }
      const formData = new FormData();
      formData.append('file', file);
      return api.post(`/admin/pharmacies/${business.id}/products/import`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    },
    onSuccess: (response) => {
      const { created, errors } = response.data;
      if (errors > 0) {
        toast.success(`${created} produit(s) importé(s), ${errors} erreur(s)`);
      } else {
        toast.success(`${created} produit(s) importé(s) avec succès !`);
      }
      queryClient.invalidateQueries({ queryKey: ['admin-pharmacies'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
      setSelectedFile(null);
      setShowImportSection(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'import des produits');
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (extension && ['xlsx', 'xls', 'csv'].includes(extension)) {
        setSelectedFile(file);
      } else {
        toast.error('Format de fichier non supporté. Utilisez .xlsx, .xls ou .csv');
      }
    }
  };

  const handleImport = () => {
    if (selectedFile) {
      importMutation.mutate(selectedFile);
    }
  };

  if (!business) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-GN').format(value) + ' GNF';
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={business.name} size="lg">
      <div className="space-y-6">
        {/* Type d'activité */}
        <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-xl">
          <span className="text-4xl">{getBusinessTypeIcon(business.business_type)}</span>
          <div>
            <p className="text-sm text-purple-600 font-medium">Type d'activité</p>
            <p className="text-lg font-bold text-purple-800">{getBusinessTypeLabel(business.business_type)}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-purple-50 p-4 rounded-xl text-center">
            <Users className="w-6 h-6 text-purple-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-purple-800">{business.users_count}</p>
            <p className="text-xs text-purple-600">Utilisateurs</p>
          </div>
          <div className="bg-blue-50 p-4 rounded-xl text-center">
            <Package className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-blue-800">{business.products_count}</p>
            <p className="text-xs text-blue-600">Produits</p>
          </div>
          <div className="bg-green-50 p-4 rounded-xl text-center">
            <TrendingUp className="w-6 h-6 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-green-800">{business.sales_count}</p>
            <p className="text-xs text-green-600">Ventes</p>
          </div>
          <div className="bg-orange-50 p-4 rounded-xl text-center">
            <DollarSign className="w-6 h-6 text-orange-600 mx-auto mb-2" />
            <p className="text-lg font-bold text-orange-800">{formatCurrency(business.total_sales)}</p>
            <p className="text-xs text-orange-600">CA Total</p>
          </div>
        </div>

        {/* Info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">Adresse</h4>
            <p className="text-gray-900">{business.address || 'N/A'}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">Ville</h4>
            <p className="text-gray-900">{business.city || 'N/A'}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">Téléphone</h4>
            <p className="text-gray-900">{business.phone || 'N/A'}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">Email</h4>
            <p className="text-gray-900">{business.email || 'N/A'}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">N° Registre / Licence</h4>
            <p className="text-gray-900">{business.license_number || 'N/A'}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">Créé le</h4>
            <p className="text-gray-900">
              {new Date(business.created_at).toLocaleDateString('fr-FR')}
            </p>
          </div>
        </div>

        {/* Import Products Section */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-700">Import de produits</h4>
            <button
              onClick={() => setShowImportSection(!showImportSection)}
              className="btn-secondary text-sm py-1.5 px-3"
            >
              {showImportSection ? 'Masquer' : 'Afficher'}
            </button>
          </div>

          {showImportSection && (
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="label text-sm">Importer des produits depuis un fichier</label>
                <p className="text-xs text-gray-500 mb-3">
                  Formats supportés: Excel (.xlsx, .xls) ou CSV
                </p>
                
                {!selectedFile ? (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-white hover:bg-gray-50 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-2 text-gray-400" />
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold">Cliquez pour télécharger</span> ou glissez-déposez
                      </p>
                      <p className="text-xs text-gray-500">Excel ou CSV</p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </label>
                ) : (
                  <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileSpreadsheet className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="text-sm font-medium text-green-900">{selectedFile.name}</p>
                        <p className="text-xs text-green-600">
                          {(selectedFile.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedFile(null)}
                      className="p-1 hover:bg-green-100 rounded"
                    >
                      <X className="w-4 h-4 text-green-600" />
                    </button>
                  </div>
                )}
              </div>

              <div className="p-3 bg-white rounded-lg border border-gray-200">
                <p className="text-xs font-medium text-gray-700 mb-2">Colonnes attendues dans le fichier:</p>
                <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
                  <li><strong>nom</strong> (requis) - Nom du produit</li>
                  <li><strong>prix_achat</strong> (requis) - Prix d'achat</li>
                  <li><strong>prix_vente</strong> (requis) - Prix de vente</li>
                  <li>description, code_barres, sku, quantite, quantite_min, unite, date_fabrication, date_expiration, ordonnance_requise (optionnels)</li>
                </ul>
              </div>

              {selectedFile && (
                <button
                  onClick={handleImport}
                  disabled={importMutation.isPending}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {importMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  {importMutation.isPending ? 'Import en cours...' : 'Importer les produits'}
                </button>
              )}
            </div>
          )}
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

        <div className="flex justify-between pt-4 border-t">
          <button 
            onClick={() => {
              if (onEdit && business) {
                onClose();
                onEdit(business);
              }
            }}
            className="btn-secondary flex items-center gap-2"
          >
            <Edit className="w-4 h-4" />
            Modifier
          </button>
          <button onClick={onClose} className="btn-primary">
            Fermer
          </button>
        </div>
      </div>
    </Modal>
  );
}

// Business Edit Modal
function BusinessEditModal({ 
  isOpen, 
  onClose, 
  business 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  business: Business | null;
}) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    phone: '',
    email: '',
    license_number: '',
    business_type: 'general',
  });

  // Initialiser le formulaire quand le business change
  useEffect(() => {
    if (business) {
      setFormData({
        name: business.name || '',
        address: business.address || '',
        city: business.city || '',
        phone: business.phone || '',
        email: business.email || '',
        license_number: business.license_number || '',
        business_type: business.business_type || 'general',
      });
    }
  }, [business]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      return api.put(`/admin/pharmacies/${business?.id}`, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pharmacies'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
      toast.success('Commerce modifié avec succès');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Erreur lors de la modification');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error('Le nom du commerce est requis');
      return;
    }
    updateMutation.mutate();
  };

  if (!business) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Modifier: ${business.name}`} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Type d'activité */}
        <div>
          <label className="label">Type d'activité</label>
          <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
            {BUSINESS_TYPES.map((type) => (
              <button
                key={type.id}
                type="button"
                onClick={() => setFormData({ ...formData, business_type: type.id })}
                className={clsx(
                  'flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all text-center',
                  formData.business_type === type.id
                    ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-200'
                    : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50/50'
                )}
              >
                <span className="text-2xl">{type.icon}</span>
                <span className="font-medium text-xs text-gray-900">{type.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Nom */}
        <div>
          <label className="label">Nom du commerce *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="input"
            placeholder="Mon Commerce"
            required
          />
        </div>

        {/* Ville & Téléphone */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Ville</label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              className="input"
              placeholder="Conakry"
            />
          </div>
          <div>
            <label className="label">Téléphone</label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="input"
              placeholder="+224 620 00 00 00"
            />
          </div>
        </div>

        {/* Adresse */}
        <div>
          <label className="label">Adresse</label>
          <input
            type="text"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            className="input"
            placeholder="Rue de la République"
          />
        </div>

        {/* Email & Licence */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="input"
              placeholder="contact@commerce.gn"
            />
          </div>
          <div>
            <label className="label">N° Registre / Licence</label>
            <input
              type="text"
              value={formData.license_number}
              onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
              className="input"
              placeholder="RC-GN-001"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <button type="button" onClick={onClose} className="btn-secondary">
            Annuler
          </button>
          <button 
            type="submit"
            disabled={updateMutation.isPending}
            className="btn-primary flex items-center gap-2"
          >
            {updateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {updateMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

