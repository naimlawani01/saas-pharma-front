import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { 
  Plus, 
  Search,
  RefreshCw,
  Package,
  Truck,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  ArrowLeft,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import Modal from '@/components/ui/Modal';
import Pagination, { usePagination } from '@/components/ui/Pagination';

interface OrderItem {
  id: number;
  product_id: number;
  quantity_ordered: number;
  quantity_received: number;
  unit_price: number;
  total: number;
  product?: {
    id: number;
    name: string;
  };
  product_received_id?: number | null;
  product_received?: {
    id: number;
    name: string;
  };
  substitution_reason?: string | null;
  is_returned?: boolean;
  return_quantity?: number;
  return_reason?: string | null;
  return_date?: string | null;
}

interface SupplierOrder {
  id: number;
  order_number: string;
  supplier_id: number;
  supplier?: {
    id: number;
    name: string;
  };
  total_amount: number;
  status: string;
  expected_delivery_date: string | null;
  notes: string | null;
  created_at: string;
  items: OrderItem[];
}

interface Supplier {
  id: number;
  name: string;
}

interface Product {
  id: number;
  name: string;
  purchase_price: number;
  quantity: number;
  min_quantity: number;
  barcode?: string | null;
}

export default function SupplierOrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<SupplierOrder | null>(null);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedItemForReturn, setSelectedItemForReturn] = useState<OrderItem | null>(null);
  
  // Détecter si on vient de la page fournisseurs avec un supplier_id
  useEffect(() => {
    const supplierId = searchParams.get('supplier_id');
    const action = searchParams.get('action');
    
    if (supplierId && action === 'create') {
      setShowCreateModal(true);
      // Nettoyer les paramètres après ouverture
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  // Récupérer les commandes
  const { data: orders, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['supplier-orders', search],
    queryFn: async () => {
      const response = await api.get('/suppliers/orders');
      return response.data as SupplierOrder[];
    },
  });

  // Récupérer les fournisseurs
  const { data: suppliers } = useQuery({
    queryKey: ['suppliers-list'],
    queryFn: async () => {
      const response = await api.get('/suppliers');
      return response.data as Supplier[];
    },
  });

  // Récupérer les produits
  const { data: products } = useQuery({
    queryKey: ['products-list'],
    queryFn: async () => {
      const response = await api.get('/products');
      return response.data as Product[];
    },
  });

  const handleRefresh = () => {
    refetch();
    toast.success('Liste actualisée');
  };

  const handleViewOrder = (order: SupplierOrder) => {
    setSelectedOrder(order);
    setShowDetailsModal(true);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-GN').format(value) + ' GNF';
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'badge-warning',
      confirmed: 'badge-info',
      shipped: 'bg-purple-100 text-purple-800',
      received: 'badge-success',
      cancelled: 'badge-danger',
    };
    return styles[status] || 'badge-info';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'En attente',
      confirmed: 'Confirmée',
      shipped: 'Expédiée',
      received: 'Reçue',
      cancelled: 'Annulée',
    };
    return labels[status] || status;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'confirmed':
      case 'shipped':
        return <Truck className="w-4 h-4" />;
      case 'received':
        return <CheckCircle className="w-4 h-4" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Package className="w-4 h-4" />;
    }
  };

  const filteredOrders = orders?.filter(order =>
    order.order_number.toLowerCase().includes(search.toLowerCase()) ||
    order.supplier?.name.toLowerCase().includes(search.toLowerCase())
  ) || [];

  // Pagination
  const {
    paginatedItems: paginatedOrders,
    currentPage,
    pageSize,
    totalPages,
    totalItems,
    handlePageChange,
    handlePageSizeChange,
  } = usePagination(filteredOrders, 20);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/suppliers" className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-display font-bold text-gray-900">Commandes fournisseurs</h1>
            <p className="text-gray-500">{totalItems} commande(s)</p>
          </div>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Nouvelle commande
        </button>
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
              placeholder="Rechercher par N° ou fournisseur..."
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

      {/* Orders table */}
      <div className="card overflow-hidden p-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : filteredOrders && filteredOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr className="text-left text-sm text-gray-500">
                  <th className="px-6 py-4 font-medium">N° Commande</th>
                  <th className="px-6 py-4 font-medium">Fournisseur</th>
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium">Livraison prévue</th>
                  <th className="px-6 py-4 font-medium">Montant</th>
                  <th className="px-6 py-4 font-medium">Statut</th>
                  <th className="px-6 py-4 font-medium w-20">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Package className="w-5 h-5 text-blue-600" />
                        </div>
                        <span className="font-medium text-gray-900">{order.order_number}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {order.supplier?.name || '-'}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {new Date(order.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {order.expected_delivery_date 
                        ? new Date(order.expected_delivery_date).toLocaleDateString('fr-FR')
                        : '-'
                      }
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {formatCurrency(order.total_amount)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={clsx('badge flex items-center gap-1 w-fit', getStatusBadge(order.status))}>
                        {getStatusIcon(order.status)}
                        {getStatusLabel(order.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => handleViewOrder(order)}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                        title="Voir les détails"
                      >
                        <Eye className="w-4 h-4 text-gray-500" />
                      </button>
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
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <Package className="w-12 h-12 mb-4 text-gray-300" />
            <p>Aucune commande trouvée</p>
            <button onClick={() => setShowCreateModal(true)} className="mt-4 btn-primary">
              Créer une commande
            </button>
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <Modal 
          isOpen={showDetailsModal} 
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedOrder(null);
          }}
          title={`Commande ${selectedOrder.order_number}`}
          size="lg"
        >
          {/* Order info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Fournisseur</p>
              <p className="font-semibold text-gray-900">{selectedOrder.supplier?.name}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Date commande</p>
              <p className="font-semibold text-gray-900">
                {new Date(selectedOrder.created_at).toLocaleDateString('fr-FR')}
              </p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Livraison prévue</p>
              <p className="font-semibold text-gray-900">
                {selectedOrder.expected_delivery_date 
                  ? new Date(selectedOrder.expected_delivery_date).toLocaleDateString('fr-FR')
                  : '-'
                }
              </p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Statut</p>
              <span className={clsx('badge', getStatusBadge(selectedOrder.status))}>
                {getStatusLabel(selectedOrder.status)}
              </span>
            </div>
          </div>

          {/* Items */}
          <div className="mb-6">
            <h4 className="font-semibold text-gray-900 mb-3">Articles commandés</h4>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr className="text-left text-sm text-gray-500">
                    <th className="px-4 py-3 font-medium">Produit</th>
                    <th className="px-4 py-3 font-medium text-center">Qté</th>
                    <th className="px-4 py-3 font-medium text-right">Prix unit.</th>
                    <th className="px-4 py-3 font-medium text-right">Total</th>
                    {selectedOrder.items?.some(item => item.quantity_received > 0 && (item.quantity_received - (item.return_quantity || 0)) > 0) && (
                      <th className="px-4 py-3 font-medium">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {selectedOrder.items?.map((item) => {
                    const productReceived = item.product_received_id 
                      ? products?.find(p => p.id === item.product_received_id)
                      : item.product;
                    const isSubstituted = item.product_received_id && item.product_received_id !== item.product_id;
                    const canReturn = item.quantity_received > 0 && (item.quantity_received - (item.return_quantity || 0)) > 0;

                    return (
                      <tr key={item.id} className={clsx(isSubstituted && 'bg-yellow-50')}>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          <div>
                            {item.product?.name || `Produit #${item.product_id}`}
                            {isSubstituted && (
                              <div className="text-xs text-yellow-700 mt-1">
                                ⚠️ Reçu: {productReceived?.name}
                              </div>
                            )}
                            {item.is_returned && (
                              <div className="text-xs text-red-700 mt-1">
                                🔴 Retourné: {item.return_quantity || 0} unité(s)
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div>{item.quantity_ordered}</div>
                          {item.quantity_received > 0 && (
                            <div className="text-xs text-gray-500">
                              Reçu: {item.quantity_received}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">
                          {formatCurrency(item.unit_price)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {formatCurrency(item.total)}
                        </td>
                        {canReturn && (
                          <td className="px-4 py-3">
                            <button
                              onClick={() => {
                                setSelectedItemForReturn(item);
                                setShowReturnModal(true);
                              }}
                              className="btn-sm btn-secondary text-xs"
                            >
                              Retourner
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Total */}
          <div className="bg-primary-50 p-4 rounded-lg mb-6">
            <div className="flex justify-between text-lg font-bold text-primary-700">
              <span>Total commande:</span>
              <span>{formatCurrency(selectedOrder.total_amount)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between">
            <button 
              onClick={() => setShowDetailsModal(false)}
              className="btn-secondary"
            >
              Fermer
            </button>
            {(selectedOrder.status === 'pending' || selectedOrder.status === 'confirmed' || selectedOrder.status === 'shipped') && (
              <button 
                onClick={() => {
                  setShowDetailsModal(false);
                  setShowReceiveModal(true);
                }}
                className="btn-primary flex items-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                Réceptionner la commande
              </button>
            )}
          </div>
        </Modal>
      )}

      {/* Create Order Modal */}
      <CreateOrderModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          // Nettoyer les paramètres URL
          setSearchParams({});
        }}
        suppliers={suppliers || []}
        products={products || []}
        preselectedSupplierId={searchParams.get('supplier_id') ? parseInt(searchParams.get('supplier_id')!) : null}
      />

      {/* Receive Order Modal */}
      {selectedOrder && (
        <ReceiveOrderModal
          isOpen={showReceiveModal}
          onClose={() => {
            setShowReceiveModal(false);
            setShowDetailsModal(true);
          }}
          order={selectedOrder}
          products={products || []}
          onSuccess={() => {
            setShowReceiveModal(false);
            setShowDetailsModal(false);
            setSelectedOrder(null);
          }}
        />
      )}

      {/* Return Item Modal */}
      {selectedOrder && selectedItemForReturn && (
        <ReturnItemModal
          isOpen={showReturnModal}
          onClose={() => {
            setShowReturnModal(false);
            setSelectedItemForReturn(null);
          }}
          order={selectedOrder}
          item={selectedItemForReturn}
          onSuccess={() => {
            setShowReturnModal(false);
            setSelectedItemForReturn(null);
            // Recharger les détails de la commande
            queryClient.invalidateQueries({ queryKey: ['supplier-orders'] });
          }}
        />
      )}
    </div>
  );
}

// Create Order Modal Component
function CreateOrderModal({ 
  isOpen, 
  onClose, 
  suppliers, 
  products,
  preselectedSupplierId 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  suppliers: Supplier[];
  products: Product[];
  preselectedSupplierId?: number | null;
}) {
  const queryClient = useQueryClient();
  const [supplierId, setSupplierId] = useState<number | null>(preselectedSupplierId || null);
  
  // Mettre à jour le supplierId si preselectedSupplierId change
  useEffect(() => {
    if (preselectedSupplierId && isOpen) {
      setSupplierId(preselectedSupplierId);
    }
  }, [preselectedSupplierId, isOpen]);
  
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<{ product_id: number; quantity: number; unit_price: number }[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  // Fermer la dropdown quand on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.product-search-container')) {
        setShowProductDropdown(false);
      }
    };

    if (showProductDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showProductDropdown]);
  
  // Récupérer user depuis le store
  const { user } = useAuthStore();

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user?.pharmacy_id || !user?.id) {
        throw new Error('Utilisateur non authentifié');
      }
      
      if (!supplierId) {
        throw new Error('Veuillez sélectionner un fournisseur');
      }
      
      if (items.length === 0) {
        throw new Error('Veuillez ajouter au moins un produit');
      }
      
      // Convertir les items : quantity -> quantity_ordered
      const orderItems = items.map(item => ({
        product_id: item.product_id,
        quantity_ordered: item.quantity,
        unit_price: item.unit_price,
      }));
      
      // Convertir la date si elle existe (format ISO pour FastAPI)
      let expectedDeliveryDate: string | null = null;
      if (expectedDate && expectedDate.trim() !== '') {
        // S'assurer que la date est au format ISO avec timezone
        const date = new Date(expectedDate);
        if (!isNaN(date.getTime())) {
          expectedDeliveryDate = date.toISOString();
        }
      }
      
      const payload = {
        pharmacy_id: user.pharmacy_id,
        user_id: user.id,
        supplier_id: supplierId,
        expected_delivery_date: expectedDeliveryDate,
        tax: 0.0,
        shipping_cost: 0.0,
        notes: notes && notes.trim() !== '' ? notes.trim() : null,
        items: orderItems,
      };
      
      return api.post('/suppliers/orders', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-orders'] });
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('Commande créée avec succès');
      resetForm();
      onClose();
    },
    onError: (error: any) => {
      // Gérer les erreurs de validation FastAPI
      let errorMessage = 'Erreur lors de la création';
      
      if (error.response?.data) {
        const errorData = error.response.data;
        
        // Si c'est une erreur de validation FastAPI (422)
        if (errorData.detail && Array.isArray(errorData.detail)) {
          const validationErrors = errorData.detail.map((err: any) => {
            const field = err.loc?.join('.') || 'champ';
            return `${field}: ${err.msg}`;
          }).join(', ');
          errorMessage = `Erreur de validation: ${validationErrors}`;
        } else if (typeof errorData.detail === 'string') {
          errorMessage = errorData.detail;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      }
      
      toast.error(errorMessage);
    },
  });

  const resetForm = () => {
    // Ne pas réinitialiser le supplierId si c'était pré-sélectionné
    if (!preselectedSupplierId) {
      setSupplierId(null);
    } else {
      setSupplierId(preselectedSupplierId);
    }
    setExpectedDate('');
    setNotes('');
    setItems([]);
    setSelectedProductId(null);
    setQuantity(1);
    setProductSearch('');
    setShowProductDropdown(false);
  };
  
  // Réinitialiser quand le modal se ferme (sauf le supplierId si pré-sélectionné)
  useEffect(() => {
    if (!isOpen) {
      setExpectedDate('');
      setNotes('');
      setItems([]);
      setSelectedProductId(null);
      setQuantity(1);
      setProductSearch('');
      setShowProductDropdown(false);
      // Réinitialiser le supplierId seulement si ce n'était pas pré-sélectionné
      if (!preselectedSupplierId) {
        setSupplierId(null);
      }
    }
  }, [isOpen, preselectedSupplierId]);

  // Filtrer les produits selon la recherche
  const filteredProducts = productSearch.length >= 1
    ? products.filter(p => 
        p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        (p.barcode && p.barcode.toLowerCase().includes(productSearch.toLowerCase()))
      )
    : [];

  const addItem = () => {
    if (!selectedProductId) return;
    
    const product = products.find(p => p.id === selectedProductId);
    if (!product) return;

    const existingIndex = items.findIndex(i => i.product_id === selectedProductId);
    if (existingIndex >= 0) {
      const newItems = [...items];
      newItems[existingIndex].quantity += quantity;
      setItems(newItems);
    } else {
      setItems([...items, {
        product_id: selectedProductId,
        quantity,
        unit_price: product.purchase_price,
      }]);
    }
    setSelectedProductId(null);
    setProductSearch('');
    setShowProductDropdown(false);
    setQuantity(1);
  };

  const selectProduct = (product: Product) => {
    setSelectedProductId(product.id);
    setProductSearch(product.name);
    setShowProductDropdown(false);
  };

  const removeItem = (productId: number) => {
    setItems(items.filter(i => i.product_id !== productId));
  };

  const total = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-GN').format(value) + ' GNF';
  };

  const handleSubmit = () => {
    if (!supplierId) {
      toast.error('Sélectionnez un fournisseur');
      return;
    }
    if (items.length === 0) {
      toast.error('Ajoutez au moins un produit');
      return;
    }
    createMutation.mutate();
  };

  // Produits en stock bas
  const lowStockProducts = products.filter(p => p.quantity <= p.min_quantity);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nouvelle commande fournisseur" size="lg">
      <div className="space-y-4">
        {/* Supplier */}
        <div>
          <label className="label">Fournisseur *</label>
          <select
            value={supplierId || ''}
            onChange={(e) => setSupplierId(parseInt(e.target.value))}
            className="input"
          >
            <option value="">-- Sélectionner --</option>
            {suppliers.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* Expected date */}
        <div>
          <label className="label">Date de livraison prévue</label>
          <input
            type="date"
            value={expectedDate}
            onChange={(e) => setExpectedDate(e.target.value)}
            className="input"
          />
        </div>

        {/* Produits en stock bas */}
        {lowStockProducts.length > 0 && (
          <div className="p-3 bg-yellow-50 rounded-lg">
            <p className="text-sm font-medium text-yellow-800 mb-2">
              ⚠️ Produits en stock bas ({lowStockProducts.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {lowStockProducts.slice(0, 5).map(p => (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelectedProductId(p.id);
                    setProductSearch(p.name);
                    setQuantity(p.min_quantity - p.quantity + 10);
                  }}
                  className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded hover:bg-yellow-200"
                >
                  {p.name} ({p.quantity}/{p.min_quantity})
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Add products */}
        <div className="border rounded-lg p-4">
          <label className="label">Ajouter un produit</label>
          <div className="space-y-2">
            <div className="relative flex gap-2">
              <div className="flex-1 relative product-search-container">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => {
                    setProductSearch(e.target.value);
                    setShowProductDropdown(true);
                    setSelectedProductId(null);
                  }}
                  onFocus={() => setShowProductDropdown(true)}
                  placeholder="Rechercher un produit (nom ou code-barres)..."
                  className="input pl-10 flex-1"
                />
                
                {/* Dropdown avec résultats de recherche */}
                {showProductDropdown && productSearch.length >= 1 && filteredProducts.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredProducts.map(product => (
                      <button
                        key={product.id}
                        onClick={() => selectProduct(product)}
                        className="w-full flex items-center justify-between p-3 hover:bg-gray-50 text-left border-b last:border-b-0"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{product.name}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <p className="text-sm text-gray-500">Stock: {product.quantity}</p>
                            {product.barcode && (
                              <p className="text-xs text-gray-400">Code: {product.barcode}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <p className="font-medium text-primary-600">
                            {formatCurrency(product.purchase_price)}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                
                {showProductDropdown && productSearch.length >= 1 && filteredProducts.length === 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg p-4 text-center text-gray-500 text-sm">
                    Aucun produit trouvé
                  </div>
                )}
              </div>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                min="1"
                className="input w-24"
                placeholder="Qté"
              />
              <button 
                onClick={addItem} 
                className="btn-primary"
                disabled={!selectedProductId}
              >
                Ajouter
              </button>
            </div>
            
            {/* Afficher le produit sélectionné */}
            {selectedProductId && (
              <div className="flex items-center gap-2 p-2 bg-primary-50 rounded-lg">
                <span className="text-sm text-gray-700">
                  Produit sélectionné: <strong>{products.find(p => p.id === selectedProductId)?.name}</strong>
                </span>
                <button
                  onClick={() => {
                    setSelectedProductId(null);
                    setProductSearch('');
                  }}
                  className="ml-auto text-gray-500 hover:text-gray-700"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Items list */}
        {items.length > 0 && (
          <div className="space-y-2">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                💡 <strong>Note :</strong> Le prix unitaire est initialisé avec le prix d'achat du produit. 
                Vous pouvez le modifier si le fournisseur propose un prix différent. 
                Le prix de vente du produit n'est pas affecté par cette commande.
              </p>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
              <thead className="bg-gray-50">
                <tr className="text-left text-sm text-gray-500">
                  <th className="px-4 py-2 font-medium">Produit</th>
                  <th className="px-4 py-2 font-medium text-center">Qté</th>
                  <th className="px-4 py-2 font-medium text-right">Prix unitaire</th>
                  <th className="px-4 py-2 font-medium text-right">Total</th>
                  <th className="px-4 py-2 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item, index) => {
                  const product = products.find(p => p.id === item.product_id);
                  return (
                    <tr key={item.product_id}>
                      <td className="px-4 py-2">
                        <div>
                          <div className="font-medium text-gray-900">{product?.name}</div>
                          {product && (
                            <div className="text-xs text-gray-500">
                              Prix d'achat: {formatCurrency(product.purchase_price)}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => {
                            const newItems = [...items];
                            newItems[index].quantity = parseInt(e.target.value) || 1;
                            setItems(newItems);
                          }}
                          min="1"
                          className="input w-20 text-center"
                        />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <input
                          type="number"
                          value={item.unit_price}
                          onChange={(e) => {
                            const newItems = [...items];
                            newItems[index].unit_price = parseFloat(e.target.value) || 0;
                            setItems(newItems);
                          }}
                          min="0"
                          step="0.01"
                          className="input w-32 text-right"
                        />
                      </td>
                      <td className="px-4 py-2 text-right font-medium">
                        {formatCurrency(item.quantity * item.unit_price)}
                      </td>
                      <td className="px-4 py-2">
                        <button
                          onClick={() => removeItem(item.product_id)}
                          className="text-red-500 hover:text-red-700"
                          title="Supprimer"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={3} className="px-4 py-2 text-right font-medium">Total:</td>
                  <td className="px-4 py-2 text-right font-bold text-primary-600">
                    {formatCurrency(total)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
            </div>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="label">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="input min-h-[80px]"
            placeholder="Notes supplémentaires..."
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <button onClick={onClose} className="btn-secondary">
            Annuler
          </button>
          <button 
            onClick={handleSubmit}
            disabled={createMutation.isPending}
            className="btn-primary"
          >
            {createMutation.isPending ? 'Création...' : 'Créer la commande'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// Receive Order Modal Component
function ReceiveOrderModal({
  isOpen,
  onClose,
  order,
  products,
  onSuccess
}: {
  isOpen: boolean;
  onClose: () => void;
  order: SupplierOrder;
  products: Product[];
  onSuccess: () => void;
}) {
  const queryClient = useQueryClient();
  const [receiveItems, setReceiveItems] = useState<Record<number, {
    quantity_received: number;
    product_received_id: number | null;
    substitution_reason: string;
    notes: string;
  }>>({});

  // Initialiser les données de réception
  useEffect(() => {
    if (isOpen && order) {
      const initialItems: Record<number, any> = {};
      order.items.forEach(item => {
        initialItems[item.id] = {
          quantity_received: item.quantity_received || 0,
          product_received_id: item.product_received_id || item.product_id,
          substitution_reason: item.substitution_reason || '',
          notes: ''
        };
      });
      setReceiveItems(initialItems);
    }
  }, [isOpen, order]);

  const receiveMutation = useMutation({
    mutationFn: async () => {
      const items = Object.entries(receiveItems).map(([itemId, data]) => ({
        item_id: parseInt(itemId),
        quantity_received: data.quantity_received,
        product_received_id: data.product_received_id !== order.items.find(i => i.id === parseInt(itemId))?.product_id 
          ? data.product_received_id 
          : null,
        substitution_reason: data.product_received_id !== order.items.find(i => i.id === parseInt(itemId))?.product_id
          ? data.substitution_reason
          : null,
        notes: data.notes || null
      }));

      return api.put(`/suppliers/orders/${order.id}/receive-items`, { items });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-orders'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Commande réceptionnée avec succès');
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Erreur lors de la réception');
    }
  });

  const updateItem = (itemId: number, field: string, value: any) => {
    setReceiveItems(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value
      }
    }));
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-GN').format(value) + ' GNF';
  };

  const handleSubmit = () => {
    // Validation
    for (const [itemId, data] of Object.entries(receiveItems)) {
      const item = order.items.find(i => i.id === parseInt(itemId));
      if (!item) continue;

      if (data.quantity_received < 0) {
        toast.error(`La quantité reçue ne peut pas être négative pour ${item.product?.name}`);
        return;
      }

      if (data.product_received_id !== item.product_id && !data.substitution_reason.trim()) {
        toast.error(`Raison de substitution requise pour ${item.product?.name}`);
        return;
      }
    }

    receiveMutation.mutate();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Réceptionner la commande ${order.order_number}`} size="xl">
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            💡 <strong>Instructions :</strong> Pour chaque produit, indiquez la quantité reçue. 
            Si vous avez reçu un produit différent, sélectionnez-le et justifiez la substitution.
          </p>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr className="text-left text-sm text-gray-500">
                <th className="px-4 py-3 font-medium">Produit commandé</th>
                <th className="px-4 py-3 font-medium text-center">Qté commandée</th>
                <th className="px-4 py-3 font-medium text-center">Qté reçue</th>
                <th className="px-4 py-3 font-medium">Produit reçu</th>
                <th className="px-4 py-3 font-medium">Raison substitution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {order.items.map(item => {
                const receiveData = receiveItems[item.id] || {
                  quantity_received: 0,
                  product_received_id: item.product_id,
                  substitution_reason: '',
                  notes: ''
                };
                const isSubstituted = receiveData.product_received_id !== item.product_id;

                return (
                  <tr key={item.id} className={clsx(isSubstituted && 'bg-yellow-50')}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{item.product?.name}</div>
                      <div className="text-xs text-gray-500">Prix: {formatCurrency(item.unit_price)}</div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-medium">{item.quantity_ordered}</span>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={receiveData.quantity_received}
                        onChange={(e) => updateItem(item.id, 'quantity_received', parseInt(e.target.value) || 0)}
                        min="0"
                        max={item.quantity_ordered * 2}
                        className="input w-20 text-center"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={receiveData.product_received_id || ''}
                        onChange={(e) => {
                          const newProductId = parseInt(e.target.value);
                          updateItem(item.id, 'product_received_id', newProductId);
                          if (newProductId !== item.product_id) {
                            updateItem(item.id, 'substitution_reason', '');
                          }
                        }}
                        className="input text-sm"
                      >
                        <option value={item.product_id}>{item.product?.name} (produit commandé)</option>
                        {products.filter(p => p.id !== item.product_id).map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      {isSubstituted ? (
                        <textarea
                          value={receiveData.substitution_reason}
                          onChange={(e) => updateItem(item.id, 'substitution_reason', e.target.value)}
                          placeholder="Raison de la substitution (obligatoire)"
                          className="input text-sm min-h-[60px]"
                          required
                        />
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary">
            Annuler
          </button>
          <button 
            onClick={handleSubmit}
            disabled={receiveMutation.isPending}
            className="btn-primary flex items-center gap-2"
          >
            <CheckCircle className="w-5 h-5" />
            {receiveMutation.isPending ? 'Traitement...' : 'Confirmer la réception'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// Return Item Modal Component
function ReturnItemModal({
  isOpen,
  onClose,
  order,
  item,
  onSuccess
}: {
  isOpen: boolean;
  onClose: () => void;
  order: SupplierOrder;
  item: OrderItem;
  onSuccess: () => void;
}) {
  const queryClient = useQueryClient();
  const [returnQuantity, setReturnQuantity] = useState(1);
  const [returnReason, setReturnReason] = useState('');

  const availableToReturn = item.quantity_received - (item.return_quantity || 0);

  useEffect(() => {
    if (isOpen) {
      setReturnQuantity(Math.min(1, availableToReturn));
      setReturnReason('');
    }
  }, [isOpen, availableToReturn]);

  const returnMutation = useMutation({
    mutationFn: async () => {
      return api.post(`/suppliers/orders/${order.id}/return-item`, {
        item_id: item.id,
        return_quantity: returnQuantity,
        return_reason: returnReason
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-orders'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Produit retourné avec succès');
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Erreur lors du retour');
    }
  });

  const handleSubmit = () => {
    if (returnQuantity <= 0) {
      toast.error('La quantité doit être supérieure à 0');
      return;
    }

    if (returnQuantity > availableToReturn) {
      toast.error(`La quantité ne peut pas dépasser ${availableToReturn} unité(s) disponible(s)`);
      return;
    }

    if (!returnReason.trim()) {
      toast.error('Veuillez indiquer la raison du retour');
      return;
    }

    returnMutation.mutate();
  };

  const productReceived = item.product_received_id 
    ? item.product_received 
    : item.product;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Retourner un produit" size="md">
      <div className="space-y-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-sm text-yellow-800">
            ⚠️ <strong>Attention :</strong> Le retour retirera le produit du stock.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label">Produit</label>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="font-medium text-gray-900">
                {item.product?.name || `Produit #${item.product_id}`}
              </div>
              {item.product_received_id && item.product_received_id !== item.product_id && (
                <div className="text-sm text-gray-600 mt-1">
                  Reçu: {productReceived?.name}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Quantité reçue</label>
              <div className="p-3 bg-gray-50 rounded-lg text-center font-medium">
                {item.quantity_received}
              </div>
            </div>
            <div>
              <label className="label">Déjà retournée</label>
              <div className="p-3 bg-gray-50 rounded-lg text-center font-medium">
                {item.return_quantity || 0}
              </div>
            </div>
          </div>

          <div>
            <label className="label">Quantité à retourner *</label>
            <input
              type="number"
              value={returnQuantity}
              onChange={(e) => setReturnQuantity(parseInt(e.target.value) || 0)}
              min="1"
              max={availableToReturn}
              className="input"
            />
            <p className="text-xs text-gray-500 mt-1">
              Disponible: {availableToReturn} unité(s)
            </p>
          </div>

          <div>
            <label className="label">Raison du retour *</label>
            <textarea
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              className="input min-h-[100px]"
              placeholder="Expliquez la raison du retour (ex: produit défectueux, erreur de livraison, etc.)"
              required
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary">
            Annuler
          </button>
          <button 
            onClick={handleSubmit}
            disabled={returnMutation.isPending}
            className="btn-primary flex items-center gap-2"
          >
            <XCircle className="w-5 h-5" />
            {returnMutation.isPending ? 'Traitement...' : 'Confirmer le retour'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

