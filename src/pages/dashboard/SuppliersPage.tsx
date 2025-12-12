import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { 
  Plus, 
  Search,
  RefreshCw,
  Truck,
  Phone,
  Mail,
  MapPin,
  Edit,
  Trash2,
  Package,
  ShoppingCart,
  ExternalLink,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import SupplierFormModal from '@/components/suppliers/SupplierFormModal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Pagination, { usePagination } from '@/components/ui/Pagination';

interface Supplier {
  id: number;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  order_url: string | null;
  is_active: boolean;
  created_at: string;
}

export default function SuppliersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  
  // Modal states
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);

  // Récupérer les fournisseurs
  const { data: suppliers, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['suppliers', search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      const response = await api.get(`/suppliers?${params}`);
      return response.data as Supplier[];
    },
  });

  // Pagination
  const {
    paginatedItems: paginatedSuppliers,
    currentPage,
    pageSize,
    totalPages,
    totalItems,
    handlePageChange,
    handlePageSizeChange,
  } = usePagination(suppliers || [], 12);

  // Mutation pour supprimer
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return api.delete(`/suppliers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('Fournisseur supprimé avec succès');
      setShowDeleteDialog(false);
      setSupplierToDelete(null);
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
    setSelectedSupplier(null);
    setShowFormModal(true);
  };

  const handleEdit = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setShowFormModal(true);
  };

  const handleDelete = (supplier: Supplier) => {
    setSupplierToDelete(supplier);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (supplierToDelete) {
      deleteMutation.mutate(supplierToDelete.id);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Fournisseurs</h1>
          <p className="text-gray-500">{totalItems} fournisseur(s)</p>
        </div>
        <div className="flex gap-2">
          <Link to="/suppliers/orders" className="btn-secondary flex items-center gap-2">
            <Package className="w-5 h-5" />
            Commandes
          </Link>
          <button onClick={handleAdd} className="btn-primary flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Ajouter
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
              placeholder="Rechercher un fournisseur..."
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

      {/* Suppliers grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : suppliers && suppliers.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedSuppliers.map((supplier) => (
            <div key={supplier.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Truck className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{supplier.name}</h3>
                    {supplier.contact_person && (
                      <p className="text-sm text-gray-500">{supplier.contact_person}</p>
                    )}
                  </div>
                </div>
                <span className={clsx(
                  'badge text-xs',
                  supplier.is_active ? 'badge-success' : 'badge-danger'
                )}>
                  {supplier.is_active ? 'Actif' : 'Inactif'}
                </span>
              </div>
              
              <div className="space-y-2 text-sm">
                {supplier.phone && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone className="w-4 h-4" />
                    <span>{supplier.phone}</span>
                  </div>
                )}
                {supplier.email && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail className="w-4 h-4" />
                    <span className="truncate">{supplier.email}</span>
                  </div>
                )}
                {supplier.address && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin className="w-4 h-4" />
                    <span className="truncate">{supplier.address}</span>
                  </div>
                )}
                {supplier.order_url && (
                  <div className="flex items-center gap-2 text-blue-600">
                    <ExternalLink className="w-4 h-4" />
                    <a
                      href={supplier.order_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium hover:underline truncate"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Lien de commande
                    </a>
                  </div>
                )}
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex gap-2 mb-2">
                  <button
                    onClick={() => navigate(`/suppliers/orders?supplier_id=${supplier.id}&action=create`)}
                    className="flex-1 btn-primary flex items-center justify-center gap-2"
                    title="Créer une commande pour ce fournisseur"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    Commander
                  </button>
                  {supplier.order_url && (
                    <button
                      onClick={() => window.open(supplier.order_url || '', '_blank', 'noopener,noreferrer')}
                      className="btn-secondary flex items-center justify-center gap-2 px-3"
                      title="Ouvrir le lien de commande"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-400">
                    Ajouté le {new Date(supplier.created_at).toLocaleDateString('fr-FR')}
                  </p>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => handleEdit(supplier)}
                      className="p-2 hover:bg-gray-100 rounded-lg"
                      title="Modifier"
                    >
                      <Edit className="w-4 h-4 text-gray-500" />
                    </button>
                    <button 
                      onClick={() => handleDelete(supplier)}
                      className="p-2 hover:bg-red-50 rounded-lg"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>
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
            <Truck className="w-12 h-12 mb-4 text-gray-300" />
            <p>Aucun fournisseur trouvé</p>
            <button onClick={handleAdd} className="mt-4 btn-primary">
              Ajouter un fournisseur
            </button>
          </div>
        </div>
      )}

      {/* Modal de formulaire */}
      <SupplierFormModal
        isOpen={showFormModal}
        onClose={() => {
          setShowFormModal(false);
          setSelectedSupplier(null);
        }}
        supplier={selectedSupplier}
      />

      {/* Dialog de confirmation de suppression */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false);
          setSupplierToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Supprimer le fournisseur"
        message={`Êtes-vous sûr de vouloir supprimer "${supplierToDelete?.name}" ?`}
        confirmText="Supprimer"
        type="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
