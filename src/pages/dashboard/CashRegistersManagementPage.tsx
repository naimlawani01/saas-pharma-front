import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { 
  Plus,
  RefreshCw,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Settings,
} from 'lucide-react';
import { CashRegister } from '@/types/cash';
import Pagination, { usePagination } from '@/components/ui/Pagination';

export default function CashRegistersManagementPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRegister, setSelectedRegister] = useState<CashRegister | null>(null);

  // Récupérer toutes les caisses
  const { data: registers, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['cash-registers'],
    queryFn: async () => {
      const response = await api.get('/cash/registers');
      return response.data as CashRegister[];
    },
  });

  // Pagination
  const {
    paginatedItems: paginatedRegisters,
    currentPage,
    pageSize,
    totalPages,
    totalItems,
    handlePageChange,
    handlePageSizeChange,
  } = usePagination(registers || [], 12);

  const handleEdit = (register: CashRegister) => {
    setSelectedRegister(register);
    setShowEditModal(true);
  };

  const handleDelete = async (register: CashRegister) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer la caisse "${register.name}" ?`)) {
      return;
    }

    try {
      await api.delete(`/cash/registers/${register.id}`);
      toast.success('Caisse supprimée avec succès');
      queryClient.invalidateQueries({ queryKey: ['cash-registers'] });
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la suppression');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Gestion des Caisses</h1>
          <p className="text-gray-500">
            {totalItems} caisse(s) enregistrée(s)
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => refetch()} 
            disabled={isFetching}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw className={`w-5 h-5 ${isFetching ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Ajouter une caisse
          </button>
        </div>
      </div>

      {/* Liste des caisses */}
      {registers && registers.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedRegisters.map((register) => (
          <div key={register.id} className="card p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  register.is_active ? 'bg-primary-100' : 'bg-gray-100'
                }`}>
                  <Settings className={`w-6 h-6 ${
                    register.is_active ? 'text-primary-600' : 'text-gray-400'
                  }`} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{register.name}</h3>
                  <p className="text-sm text-gray-500 font-mono">{register.code}</p>
                </div>
              </div>
              {register.is_active ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-gray-400" />
              )}
            </div>

            {register.location && (
              <p className="text-sm text-gray-600 mb-4">
                📍 {register.location}
              </p>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => handleEdit(register)}
                className="btn-secondary flex-1 flex items-center justify-center gap-2"
              >
                <Edit className="w-4 h-4" />
                Modifier
              </button>
              <button
                onClick={() => handleDelete(register)}
                className="btn-secondary text-red-600 hover:bg-red-50 flex items-center justify-center"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 pt-4 border-t text-xs text-gray-500">
              Créée le {new Date(register.created_at).toLocaleDateString('fr-FR')}
            </div>
          </div>
        ))}
          </div>
          
          {/* Pagination */}
          {totalItems > 0 && (
            <div className="card">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                pageSize={pageSize}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
              />
            </div>
          )}
        </>
      ) : (
        <div className="card p-12 text-center">
          <Settings className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Aucune caisse enregistrée
          </h3>
          <p className="text-gray-500 mb-6">
            Créez votre première caisse enregistreuse pour commencer
          </p>
          <button 
            onClick={() => setShowAddModal(true)}
            className="btn-primary"
          >
            Ajouter une caisse
          </button>
        </div>
      )}

      {/* Modals */}
      {showAddModal && (
        <CashRegisterModal
          pharmacyId={user?.pharmacy_id || 0}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            queryClient.invalidateQueries({ queryKey: ['cash-registers'] });
          }}
        />
      )}

      {showEditModal && selectedRegister && (
        <CashRegisterModal
          pharmacyId={user?.pharmacy_id || 0}
          register={selectedRegister}
          onClose={() => {
            setShowEditModal(false);
            setSelectedRegister(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedRegister(null);
            queryClient.invalidateQueries({ queryKey: ['cash-registers'] });
          }}
        />
      )}
    </div>
  );
}

// Modal pour créer/modifier une caisse
interface CashRegisterModalProps {
  pharmacyId: number;
  register?: CashRegister;
  onClose: () => void;
  onSuccess: () => void;
}

function CashRegisterModal({ pharmacyId, register, onClose, onSuccess }: CashRegisterModalProps) {
  const [formData, setFormData] = useState({
    name: register?.name || '',
    code: register?.code || '',
    location: register?.location || '',
    is_active: register?.is_active ?? true,
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (register) {
        const response = await api.put(`/cash/registers/${register.id}`, data);
        return response.data;
      } else {
        const response = await api.post('/cash/registers', data);
        return response.data;
      }
    },
    onSuccess: () => {
      toast.success(register ? 'Caisse modifiée avec succès' : 'Caisse créée avec succès');
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'opération');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.code) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    mutation.mutate({
      ...formData,
      pharmacy_id: pharmacyId,
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-md">
        <div className="modal-header">
          <h3 className="modal-title">
            {register ? 'Modifier la caisse' : 'Nouvelle caisse'}
          </h3>
          <button onClick={onClose} className="modal-close">&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom de la caisse *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input"
                placeholder="Ex: Caisse Principale"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Code unique *
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                className="input font-mono"
                placeholder="Ex: CAISSE-001"
                required
                disabled={!!register} // Ne peut pas modifier le code
              />
              {register && (
                <p className="text-xs text-gray-500 mt-1">
                  Le code ne peut pas être modifié
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Emplacement
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="input"
                placeholder="Ex: Comptoir principal"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="is_active" className="text-sm text-gray-700">
                Caisse active
              </label>
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
              disabled={mutation.isPending}
              className="btn-primary"
            >
              {mutation.isPending ? 'Enregistrement...' : register ? 'Modifier' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

