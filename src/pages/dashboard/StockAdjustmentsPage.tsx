import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { 
  Plus,
  RefreshCw,
  Search,
  FileText,
  Package,
  Calendar,
  Tag,
  CheckCircle,
  Clock,
  ArrowUpCircle,
  ArrowDownCircle,
} from 'lucide-react';
import { StockAdjustment, AdjustmentReason } from '@/types/stock';
import { Product } from '@/types';
import Pagination, { usePagination } from '@/components/ui/Pagination';
import clsx from 'clsx';
import Modal from '@/components/ui/Modal';

const ADJUSTMENT_REASON_LABELS: Record<AdjustmentReason, string> = {
  [AdjustmentReason.INVENTORY]: 'Inventaire',
  [AdjustmentReason.EXPIRY]: 'Expiration',
  [AdjustmentReason.DAMAGE]: 'Dommage',
  [AdjustmentReason.LOSS]: 'Perte',
  [AdjustmentReason.THEFT]: 'Vol',
  [AdjustmentReason.ERROR]: 'Erreur',
  [AdjustmentReason.RETURN_SUPPLIER]: 'Retour fournisseur',
  [AdjustmentReason.OTHER]: 'Autre',
};

const ADJUSTMENT_REASON_COLORS: Record<AdjustmentReason, string> = {
  [AdjustmentReason.INVENTORY]: 'bg-blue-100 text-blue-800 border-blue-200',
  [AdjustmentReason.EXPIRY]: 'bg-red-100 text-red-800 border-red-200',
  [AdjustmentReason.DAMAGE]: 'bg-orange-100 text-orange-800 border-orange-200',
  [AdjustmentReason.LOSS]: 'bg-red-100 text-red-800 border-red-200',
  [AdjustmentReason.THEFT]: 'bg-red-100 text-red-800 border-red-200',
  [AdjustmentReason.ERROR]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  [AdjustmentReason.RETURN_SUPPLIER]: 'bg-purple-100 text-purple-800 border-purple-200',
  [AdjustmentReason.OTHER]: 'bg-gray-100 text-gray-800 border-gray-200',
};

export default function StockAdjustmentsPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Récupérer les ajustements
  const { data: adjustments, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['stock-adjustments'],
    queryFn: async () => {
      const response = await api.get('/stock/adjustments');
      return response.data as StockAdjustment[];
    },
  });

  // Récupérer les produits pour le modal
  const { data: products } = useQuery({
    queryKey: ['products-list'],
    queryFn: async () => {
      const response = await api.get('/products');
      return response.data as Product[];
    },
  });

  const filteredAdjustments = adjustments?.filter(adj => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      adj.product_id.toString().includes(searchLower) ||
      adj.product?.name?.toLowerCase().includes(searchLower) ||
      adj.notes?.toLowerCase().includes(searchLower) ||
      ADJUSTMENT_REASON_LABELS[adj.reason].toLowerCase().includes(searchLower)
    );
  }) || [];

  // Pagination
  const {
    paginatedItems: paginatedAdjustments,
    currentPage,
    pageSize,
    totalPages,
    totalItems,
    handlePageChange,
    handlePageSizeChange,
  } = usePagination(filteredAdjustments, 20);

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
          <h1 className="text-2xl font-display font-bold text-gray-900">Ajustements de Stock</h1>
          <p className="text-gray-500 mt-1">
            {totalItems} ajustement(s) enregistré(s)
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
            Nouvel ajustement
          </button>
        </div>
      </div>

      {/* Recherche */}
      <div className="card p-5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par produit, raison, notes..."
            className="input pl-10 w-full"
          />
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        {filteredAdjustments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500">
            <Package className="w-16 h-16 text-gray-300 mb-4" />
            <p className="text-lg font-medium">Aucun ajustement trouvé</p>
            <p className="text-sm mt-1">Créez votre premier ajustement de stock</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Date & Heure
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      Produit
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4" />
                      Raison
                    </div>
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Stock Avant
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Ajustement
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Stock Après
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Notes
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Statut
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {paginatedAdjustments.map((adjustment) => (
                  <tr 
                    key={adjustment.id} 
                    className="hover:bg-gray-50 transition-colors duration-150"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <div className="font-semibold text-gray-900">
                          {new Date(adjustment.created_at).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </div>
                        <div className="text-gray-500 text-xs mt-0.5">
                          {new Date(adjustment.created_at).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Package className="w-5 h-5 text-primary-600" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-gray-900 truncate">
                            {adjustment.product?.name || `Produit #${adjustment.product_id}`}
                          </div>
                          {adjustment.product?.barcode && (
                            <div className="text-xs text-gray-500 mt-0.5">
                              {adjustment.product.barcode}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={clsx(
                        'badge text-xs font-semibold border',
                        ADJUSTMENT_REASON_COLORS[adjustment.reason]
                      )}>
                        {ADJUSTMENT_REASON_LABELS[adjustment.reason]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-sm font-medium text-gray-600 bg-gray-50 px-3 py-1 rounded-md">
                        {adjustment.quantity_before}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {adjustment.quantity_adjusted > 0 ? (
                          <ArrowUpCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <ArrowDownCircle className="w-5 h-5 text-red-600" />
                        )}
                        <span className={clsx(
                          'font-bold text-sm',
                          adjustment.quantity_adjusted > 0 ? 'text-green-600' : 'text-red-600'
                        )}>
                          {adjustment.quantity_adjusted > 0 ? '+' : ''}{adjustment.quantity_adjusted}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-sm font-bold text-gray-900 bg-primary-50 px-3 py-1 rounded-md">
                        {adjustment.quantity_after}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600 max-w-xs">
                        {adjustment.notes ? (
                          <div className="truncate" title={adjustment.notes}>
                            {adjustment.notes}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {adjustment.is_approved ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-green-100 text-green-800 border border-green-200">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Approuvé
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-yellow-100 text-yellow-800 border border-yellow-200">
                          <Clock className="w-3.5 h-3.5" />
                          En attente
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* Pagination */}
            {totalItems > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                pageSize={pageSize}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
              />
            )}
          </div>
        )}
      </div>

      {/* Modal d'ajustement */}
      {showAddModal && (
        <AdjustmentModal
          products={products || []}
          pharmacyId={user?.pharmacy_id || 0}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            queryClient.invalidateQueries({ queryKey: ['stock-adjustments'] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
          }}
        />
      )}
    </div>
  );
}

interface AdjustmentModalProps {
  products: Product[];
  pharmacyId: number;
  onClose: () => void;
  onSuccess: () => void;
}

function AdjustmentModal({ products, pharmacyId, onClose, onSuccess }: AdjustmentModalProps) {
  const [formData, setFormData] = useState({
    product_id: 0,
    quantity_adjusted: 0,
    reason: AdjustmentReason.INVENTORY,
    notes: '',
  });

  const selectedProduct = products.find(p => p.id === formData.product_id);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/stock/adjustments', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Ajustement créé avec succès');
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Erreur lors de la création de l\'ajustement');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.product_id === 0) {
      toast.error('Veuillez sélectionner un produit');
      return;
    }

    if (formData.quantity_adjusted === 0) {
      toast.error('La quantité ajustée doit être différente de 0');
      return;
    }

    createMutation.mutate({
      ...formData,
      pharmacy_id: pharmacyId,
    });
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Nouvel ajustement de stock" size="lg">
      <form onSubmit={handleSubmit}>
        <div className="space-y-5">
          <div>
            <label className="label">Produit *</label>
            <select
              value={formData.product_id}
              onChange={(e) => setFormData({ ...formData, product_id: parseInt(e.target.value) })}
              className="input"
              required
            >
              <option value={0}>Sélectionner un produit</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} (Stock actuel: {product.quantity})
                </option>
              ))}
            </select>
          </div>

          {selectedProduct && (
            <div className="card bg-gray-50 p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">Stock actuel</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {selectedProduct.quantity} <span className="text-sm font-normal text-gray-500">{selectedProduct.unit}</span>
                  </p>
                </div>
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                  <Package className="w-6 h-6 text-primary-600" />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="label">Quantité à ajuster * (+ ou -)</label>
            <input
              type="number"
              value={formData.quantity_adjusted || ''}
              onChange={(e) => setFormData({ ...formData, quantity_adjusted: parseInt(e.target.value) || 0 })}
              className="input"
              placeholder="Ex: +10 ou -5"
              required
            />
            <p className="text-xs text-gray-500 mt-1.5">
              Positif pour augmenter le stock, négatif pour diminuer
            </p>
          </div>

          {selectedProduct && formData.quantity_adjusted !== 0 && (
            <div className={clsx(
              'card p-4 border-2',
              selectedProduct.quantity + formData.quantity_adjusted < 0 
                ? 'bg-red-50 border-red-200' 
                : 'bg-green-50 border-green-200'
            )}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">Nouveau stock après ajustement</p>
                  <p className={clsx(
                    'text-2xl font-bold mt-1',
                    selectedProduct.quantity + formData.quantity_adjusted < 0 
                      ? 'text-red-600' 
                      : 'text-green-600'
                  )}>
                    {selectedProduct.quantity + formData.quantity_adjusted} <span className="text-sm font-normal text-gray-500">{selectedProduct.unit}</span>
                  </p>
                </div>
                {selectedProduct.quantity + formData.quantity_adjusted < 0 ? (
                  <ArrowDownCircle className="w-8 h-8 text-red-600" />
                ) : (
                  <ArrowUpCircle className="w-8 h-8 text-green-600" />
                )}
              </div>
            </div>
          )}

          <div>
            <label className="label">Raison *</label>
            <select
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value as AdjustmentReason })}
              className="input"
              required
            >
              {Object.entries(ADJUSTMENT_REASON_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="input min-h-[100px]"
              placeholder="Détails sur l'ajustement..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="btn-primary"
          >
            {createMutation.isPending ? 'Création...' : 'Créer l\'ajustement'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
