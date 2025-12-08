import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { 
  Plus, 
  Search,
  RefreshCw,
  FileText,
  Calendar,
  User,
  UserCheck,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Edit,
  Trash2,
  Eye,
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { Prescription, PrescriptionStatus } from '@/types/prescription';
import PrescriptionFormModal from '@/components/prescriptions/PrescriptionFormModal';
import PrescriptionDetailsModal from '@/components/prescriptions/PrescriptionDetailsModal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Pagination, { usePagination } from '@/components/ui/Pagination';

const STATUS_LABELS: Record<PrescriptionStatus, string> = {
  [PrescriptionStatus.ACTIVE]: 'Active',
  [PrescriptionStatus.USED]: 'Utilisée',
  [PrescriptionStatus.PARTIALLY_USED]: 'Partiellement utilisée',
  [PrescriptionStatus.EXPIRED]: 'Expirée',
  [PrescriptionStatus.CANCELLED]: 'Annulée',
};

const STATUS_COLORS: Record<PrescriptionStatus, string> = {
  [PrescriptionStatus.ACTIVE]: 'bg-green-100 text-green-800 border-green-200',
  [PrescriptionStatus.USED]: 'bg-blue-100 text-blue-800 border-blue-200',
  [PrescriptionStatus.PARTIALLY_USED]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  [PrescriptionStatus.EXPIRED]: 'bg-red-100 text-red-800 border-red-200',
  [PrescriptionStatus.CANCELLED]: 'bg-gray-100 text-gray-800 border-gray-200',
};

export default function PrescriptionsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<PrescriptionStatus | ''>('');
  const [customerFilter, setCustomerFilter] = useState<number | ''>('');
  
  // Modal states
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [prescriptionToDelete, setPrescriptionToDelete] = useState<Prescription | null>(null);

  // Récupérer les prescriptions
  const { data: prescriptions, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['prescriptions', search, statusFilter, customerFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter) params.append('status_filter', statusFilter);
      if (customerFilter) params.append('customer_id', customerFilter.toString());
      const response = await api.get(`/prescriptions?${params}`);
      return response.data as Prescription[];
    },
  });

  // Récupérer les clients pour le filtre
  const { data: customers } = useQuery({
    queryKey: ['customers-list'],
    queryFn: async () => {
      const response = await api.get('/customers');
      return response.data;
    },
  });

  // Pagination
  const {
    paginatedItems: paginatedPrescriptions,
    currentPage,
    pageSize,
    totalPages,
    totalItems,
    handlePageChange,
    handlePageSizeChange,
  } = usePagination(prescriptions || [], 12);

  // Mutation pour supprimer
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return api.delete(`/prescriptions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
      toast.success('Prescription supprimée avec succès');
      setShowDeleteDialog(false);
      setPrescriptionToDelete(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Erreur lors de la suppression');
    },
  });

  const handleAdd = () => {
    setSelectedPrescription(null);
    setShowFormModal(true);
  };

  const handleEdit = (prescription: Prescription) => {
    setSelectedPrescription(prescription);
    setShowFormModal(true);
  };

  const handleView = (prescription: Prescription) => {
    setSelectedPrescription(prescription);
    setShowDetailsModal(true);
  };

  const handleDelete = (prescription: Prescription) => {
    setPrescriptionToDelete(prescription);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (prescriptionToDelete) {
      deleteMutation.mutate(prescriptionToDelete.id);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
          <h1 className="text-2xl font-display font-bold text-gray-900">Prescriptions</h1>
          <p className="text-gray-500">
            {totalItems} prescription(s)
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
            onClick={handleAdd}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Nouvelle prescription
          </button>
        </div>
      </div>

      {/* Filtres */}
      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Recherche
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher par numéro, médecin..."
                className="input pl-10"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Statut
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as PrescriptionStatus | '')}
              className="input"
            >
              <option value="">Tous les statuts</option>
              {Object.entries(STATUS_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Client
            </label>
            <select
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value ? parseInt(e.target.value) : '')}
              className="input"
            >
              <option value="">Tous les clients</option>
              {customers?.map((customer: any) => (
                <option key={customer.id} value={customer.id}>
                  {customer.first_name} {customer.last_name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Liste des prescriptions */}
      {paginatedPrescriptions && paginatedPrescriptions.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedPrescriptions.map((prescription) => (
              <div key={prescription.id} className="card hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      <FileText className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 font-mono text-sm">
                        {prescription.prescription_number}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {prescription.doctor_name}
                      </p>
                    </div>
                  </div>
                  <span className={clsx(
                    'badge text-xs font-semibold border',
                    STATUS_COLORS[prescription.status]
                  )}>
                    {STATUS_LABELS[prescription.status]}
                  </span>
                </div>

                <div className="space-y-2 text-sm mb-4">
                  <div className="flex items-center gap-2 text-gray-600">
                    <User className="w-4 h-4" />
                    <span>
                      {prescription.customer?.first_name} {prescription.customer?.last_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(prescription.prescription_date)}</span>
                  </div>
                  {prescription.expiry_date && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>Expire le {formatDate(prescription.expiry_date)}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-gray-600">
                    <FileText className="w-4 h-4" />
                    <span>{prescription.items.length} produit(s)</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => handleView(prescription)}
                    className="btn-secondary flex-1 flex items-center justify-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    Voir
                  </button>
                  {prescription.status === PrescriptionStatus.ACTIVE && (
                    <button
                      onClick={() => handleEdit(prescription)}
                      className="btn-secondary flex items-center justify-center"
                      title="Modifier"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  )}
                  {prescription.status !== PrescriptionStatus.USED && (
                    <button
                      onClick={() => handleDelete(prescription)}
                      className="btn-secondary text-red-600 hover:bg-red-50 flex items-center justify-center"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
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
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Aucune prescription
          </h3>
          <p className="text-gray-500 mb-6">
            Créez votre première prescription pour commencer
          </p>
          <button 
            onClick={handleAdd}
            className="btn-primary"
          >
            Nouvelle prescription
          </button>
        </div>
      )}

      {/* Modals */}
      {showFormModal && (
        <PrescriptionFormModal
          prescription={selectedPrescription}
          pharmacyId={user?.pharmacy_id || 0}
          isOpen={showFormModal}
          onClose={() => {
            setShowFormModal(false);
            setSelectedPrescription(null);
          }}
          onSuccess={() => {
            setShowFormModal(false);
            setSelectedPrescription(null);
            queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
          }}
        />
      )}

      {showDetailsModal && selectedPrescription && (
        <PrescriptionDetailsModal
          prescription={selectedPrescription}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedPrescription(null);
          }}
        />
      )}

      {showDeleteDialog && prescriptionToDelete && (
        <ConfirmDialog
          isOpen={showDeleteDialog}
          onClose={() => {
            setShowDeleteDialog(false);
            setPrescriptionToDelete(null);
          }}
          onConfirm={confirmDelete}
          title="Supprimer la prescription"
          message={`Êtes-vous sûr de vouloir supprimer la prescription ${prescriptionToDelete.prescription_number} ?`}
          confirmText="Supprimer"
          cancelText="Annuler"
          variant="danger"
        />
      )}
    </div>
  );
}

