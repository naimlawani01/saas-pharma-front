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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900">Clients</h1>
          <p className="text-slate-500 mt-1">{totalItems} client(s) enregistré(s)</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleExport} className="btn-secondary">
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden sm:inline">Exporter</span>
          </button>
          <button onClick={handleAdd} className="btn-primary">
            <Plus className="w-4 h-4" />
            Ajouter
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl p-5 shadow-lg shadow-slate-200/50 border border-slate-100">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par nom, téléphone..."
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all placeholder:text-slate-400"
            />
          </div>
          <button
            onClick={handleRefresh}
            disabled={isFetching}
            className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={clsx('w-4 h-4', isFetching && 'animate-spin')} />
            <span className="hidden sm:inline">Actualiser</span>
          </button>
        </div>
      </div>

      {/* Customers grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-purple-600 border-t-transparent"></div>
            <p className="text-sm text-slate-500">Chargement...</p>
          </div>
        </div>
      ) : customers && customers.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {paginatedCustomers.map((customer) => (
            <div key={customer.id} className="group bg-white rounded-2xl p-5 shadow-lg shadow-slate-200/50 border border-slate-100 hover:shadow-xl transition-all duration-300">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-200">
                    <span className="text-lg font-bold text-white">
                      {customer.first_name[0]}{customer.last_name[0]}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">
                      {customer.first_name} {customer.last_name}
                    </h3>
                    <span className={clsx(
                      'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium mt-1',
                      customer.is_active 
                        ? 'bg-emerald-50 text-emerald-700' 
                        : 'bg-red-50 text-red-700'
                    )}>
                      {customer.is_active ? 'Actif' : 'Inactif'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => handleViewHistory(customer)}
                    className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                    title="Historique des achats"
                  >
                    <History className="w-4 h-4 text-blue-500" />
                  </button>
                  <button 
                    onClick={() => handleEdit(customer)}
                    className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                    title="Modifier"
                  >
                    <Edit className="w-4 h-4 text-slate-500" />
                  </button>
                  <button 
                    onClick={() => handleDelete(customer)}
                    className="p-2 hover:bg-red-50 rounded-xl transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>
              
              <div className="space-y-2.5 text-sm">
                {customer.phone && (
                  <div className="flex items-center gap-3 text-slate-600">
                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                      <Phone className="w-4 h-4 text-slate-500" />
                    </div>
                    <span>{customer.phone}</span>
                  </div>
                )}
                {customer.email && (
                  <div className="flex items-center gap-3 text-slate-600">
                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                      <Mail className="w-4 h-4 text-slate-500" />
                    </div>
                    <span className="truncate">{customer.email}</span>
                  </div>
                )}
              </div>
              
              {customer.allergies && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="flex items-start gap-3 bg-red-50/50 rounded-xl p-3">
                    <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-xs font-semibold text-red-600 uppercase tracking-wide">Allergies</span>
                      <p className="text-sm text-red-700 mt-0.5">{customer.allergies}</p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-xs text-slate-400">
                  Client depuis le {new Date(customer.created_at).toLocaleDateString('fr-FR')}
                </p>
              </div>
            </div>
          ))}
          </div>
          
          {/* Pagination */}
          {totalItems > 0 && (
            <div className="bg-white rounded-2xl p-4 shadow-lg shadow-slate-200/50 border border-slate-100">
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
        <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100">
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-lg font-medium text-slate-700 mb-1">Aucun client trouvé</p>
            <p className="text-sm text-slate-500 mb-6">Commencez par ajouter votre premier client</p>
            <button onClick={handleAdd} className="btn-primary">
              <Plus className="w-4 h-4" />
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
