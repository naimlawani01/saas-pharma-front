import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { 
  Plus, 
  Search,
  RefreshCw,
  Users,
  Phone,
  Mail,
  Edit,
  Trash2,
  AlertCircle,
  History,
  FileSpreadsheet,
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import CustomerFormModal from '@/components/customers/CustomerFormModal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import CustomerHistoryModal from '@/components/customers/CustomerHistoryModal';
import Pagination, { usePagination } from '@/components/ui/Pagination';
import { exportToCSV } from '@/utils/exportUtils';

interface Customer {
  id: number;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  medical_history: string | null;
  allergies: string | null;
  is_active: boolean;
  created_at: string;
}

export default function CustomersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  
  // Modal states
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [customerForHistory, setCustomerForHistory] = useState<Customer | null>(null);

  // Récupérer les clients
  const { data: customers, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['customers', search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      const response = await api.get(`/customers?${params}`);
      return response.data as Customer[];
    },
  });

  // Pagination
  const {
    paginatedItems: paginatedCustomers,
    currentPage,
    pageSize,
    totalPages,
    totalItems,
    handlePageChange,
    handlePageSizeChange,
  } = usePagination(customers || [], 12);

  // Mutation pour supprimer
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return api.delete(`/customers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Client supprimé avec succès');
      setShowDeleteDialog(false);
      setCustomerToDelete(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Erreur lors de la suppression');
    },
  });

  const handleRefresh = () => {
    refetch();
    toast.success('Liste actualisée');
  };

  const handleAdd = () => {
    setSelectedCustomer(null);
    setShowFormModal(true);
  };

  const handleEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowFormModal(true);
  };

  const handleDelete = (customer: Customer) => {
    setCustomerToDelete(customer);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (customerToDelete) {
      deleteMutation.mutate(customerToDelete.id);
    }
  };

  const handleViewHistory = (customer: Customer) => {
    setCustomerForHistory(customer);
    setShowHistoryModal(true);
  };

  const handleExport = () => {
    if (!customers || customers.length === 0) {
      toast.error('Aucune donnée à exporter');
      return;
    }

    const data = customers.map(c => ({
      'Nom': c.last_name,
      'Prénom': c.first_name,
      'Téléphone': c.phone || '',
      'Email': c.email || '',
      'Ville': c.city || '',
      'Adresse': c.address || '',
      'Allergies': c.allergies || '',
      'Date création': new Date(c.created_at).toLocaleDateString('fr-FR'),
    }));

    exportToCSV(data, `clients-${new Date().toISOString().split('T')[0]}`);
    toast.success('Export généré');
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Clients</h1>
          <p className="text-gray-500">{totalItems} client(s) enregistré(s)</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="btn-secondary flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Exporter
          </button>
          <button onClick={handleAdd} className="btn-primary flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Ajouter un client
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par nom, téléphone..."
              className="input pl-10"
            />
          </div>
          <button
            onClick={handleRefresh}
            disabled={isFetching}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw className={clsx('w-5 h-5', isFetching && 'animate-spin')} />
            Actualiser
          </button>
        </div>
      </div>

      {/* Customers grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : customers && customers.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedCustomers.map((customer) => (
            <div key={customer.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-lg font-semibold text-primary-700">
                      {customer.first_name[0]}{customer.last_name[0]}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {customer.first_name} {customer.last_name}
                    </h3>
                    <span className={clsx(
                      'badge text-xs',
                      customer.is_active ? 'badge-success' : 'badge-danger'
                    )}>
                      {customer.is_active ? 'Actif' : 'Inactif'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => handleViewHistory(customer)}
                    className="p-2 hover:bg-blue-50 rounded-lg"
                    title="Historique des achats"
                  >
                    <History className="w-4 h-4 text-blue-500" />
                  </button>
                  <button 
                    onClick={() => handleEdit(customer)}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                    title="Modifier"
                  >
                    <Edit className="w-4 h-4 text-gray-500" />
                  </button>
                  <button 
                    onClick={() => handleDelete(customer)}
                    className="p-2 hover:bg-red-50 rounded-lg"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                {customer.phone && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone className="w-4 h-4" />
                    <span>{customer.phone}</span>
                  </div>
                )}
                {customer.email && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail className="w-4 h-4" />
                    <span className="truncate">{customer.email}</span>
                  </div>
                )}
              </div>
              
              {customer.allergies && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 mt-0.5" />
                    <div>
                      <span className="text-xs font-medium text-red-600">Allergies:</span>
                      <p className="text-sm text-gray-600">{customer.allergies}</p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-400">
                  Client depuis le {new Date(customer.created_at).toLocaleDateString('fr-FR')}
                </p>
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
        <div className="card">
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <Users className="w-12 h-12 mb-4 text-gray-300" />
            <p>Aucun client trouvé</p>
            <button onClick={handleAdd} className="mt-4 btn-primary">
              Ajouter un client
            </button>
          </div>
        </div>
      )}

      {/* Modal de formulaire */}
      <CustomerFormModal
        isOpen={showFormModal}
        onClose={() => {
          setShowFormModal(false);
          setSelectedCustomer(null);
        }}
        customer={selectedCustomer}
      />

      {/* Dialog de confirmation de suppression */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false);
          setCustomerToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Supprimer le client"
        message={`Êtes-vous sûr de vouloir supprimer "${customerToDelete?.first_name} ${customerToDelete?.last_name}" ?`}
        confirmText="Supprimer"
        type="danger"
        isLoading={deleteMutation.isPending}
      />

      {/* Modal historique des achats */}
      <CustomerHistoryModal
        isOpen={showHistoryModal}
        onClose={() => {
          setShowHistoryModal(false);
          setCustomerForHistory(null);
        }}
        customer={customerForHistory}
      />
    </div>
  );
}
