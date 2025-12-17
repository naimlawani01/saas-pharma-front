import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { isFeatureEnabled, getBusinessConfig } from '@/config/businessConfig';
import { 
  Plus, 
  Search, 
  RefreshCw,
  Package,
  Edit,
  Trash2,
  AlertTriangle,
  FileSpreadsheet,
  FileText,
  Tag,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import ProductFormModal from '@/components/products/ProductFormModal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Pagination, { usePagination } from '@/components/ui/Pagination';
import { exportProductsReport, exportToPDF, generateHTMLTable, formatCurrency as formatCurrencyExport } from '@/utils/exportUtils';

interface Product {
  id: number;
  name: string;
  description: string | null;
  barcode: string | null;
  sku: string | null;
  category_id: number | null;
  category?: {
    id: number;
    name: string;
  } | null;
  quantity: number;
  min_quantity: number;
  unit: string;
  purchase_price: number;
  selling_price: number;
  expiry_date: string | null;
  is_active: boolean;
  is_prescription_required: boolean;
}

interface Category {
  id: number;
  name: string;
  description: string | null;
}

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const businessConfig = getBusinessConfig();
  const showExpiryDates = isFeatureEnabled('expiryDates');
  const showPrescriptions = isFeatureEnabled('prescriptions');
  
  const [search, setSearch] = useState('');
  const [showLowStock, setShowLowStock] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  
  // Modal states
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // Récupérer les catégories
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await api.get('/products/categories');
      return response.data as Category[];
    },
  });

  // Récupérer les produits
  const { data: products, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['products', search, showLowStock, selectedCategoryId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (showLowStock) params.append('low_stock', 'true');
      if (selectedCategoryId) params.append('category_id', selectedCategoryId.toString());
      const response = await api.get(`/products?${params}`);
      return response.data as Product[];
    },
  });

  // Pagination
  const {
    paginatedItems: paginatedProducts,
    currentPage,
    pageSize,
    totalPages,
    totalItems,
    handlePageChange,
    handlePageSizeChange,
  } = usePagination(products || [], 20);

  // Mutation pour supprimer
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return api.delete(`/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Produit supprimé avec succès');
      setShowDeleteDialog(false);
      setProductToDelete(null);
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
    setSelectedProduct(null);
    setShowFormModal(true);
  };

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setShowFormModal(true);
  };

  const handleDelete = (product: Product) => {
    setProductToDelete(product);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (productToDelete) {
      deleteMutation.mutate(productToDelete.id);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-GN').format(value) + ' GNF';
  };

  const isLowStock = (product: Product) => product.quantity <= product.min_quantity;
  const isExpiringSoon = (product: Product) => {
    if (!product.expiry_date) return false;
    const expiryDate = new Date(product.expiry_date);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return expiryDate <= thirtyDaysFromNow;
  };

  const handleExportExcel = () => {
    if (!products || products.length === 0) {
      toast.error('Aucun produit à exporter');
      return;
    }
    exportProductsReport(products);
    toast.success('Export Excel généré');
  };

  const handleExportPDF = () => {
    if (!products || products.length === 0) {
      toast.error('Aucun produit à exporter');
      return;
    }

    // Calculer les statistiques
    const totalProducts = products.length;
    const lowStockCount = products.filter(p => p.quantity <= p.min_quantity).length;
    const totalValue = products.reduce((sum, p) => sum + (p.selling_price * p.quantity), 0);

    const content = `
      <p><strong>Date:</strong> ${new Date().toLocaleDateString('fr-FR')}</p>
      <p><strong>Total produits:</strong> ${totalProducts}</p>
      <p><strong>Produits en stock critique:</strong> ${lowStockCount}</p>
      <p><strong>Valeur totale du stock:</strong> ${formatCurrencyExport(totalValue)}</p>
      
      <h2 style="margin-top: 20px;">Liste des produits</h2>
      ${generateHTMLTable(products, [
        { key: 'name', label: 'Produit' },
        { key: 'barcode', label: 'Code-barres' },
        { key: 'quantity', label: 'Stock' },
        { key: 'min_quantity', label: 'Min' },
        { key: 'purchase_price', label: 'Prix achat', format: (v) => formatCurrencyExport(v) },
        { key: 'selling_price', label: 'Prix vente', format: (v) => formatCurrencyExport(v) },
        { key: 'expiry_date', label: 'Expiration', format: (v) => v ? new Date(v).toLocaleDateString('fr-FR') : '-' },
      ])}
    `;

    exportToPDF('Inventaire des produits', content, `inventaire-${new Date().toISOString().split('T')[0]}`);
    toast.success('Export PDF généré');
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">{businessConfig.terminology.productPlural}</h1>
          <p className="text-gray-500">
            {products?.length || 0} {businessConfig.terminology.product.toLowerCase()}(s) dans l'inventaire
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleExportExcel}
            className="btn-secondary flex items-center gap-2"
            title="Export Excel"
          >
            <FileSpreadsheet className="w-5 h-5" />
            Excel
          </button>
          <button 
            onClick={handleExportPDF}
            className="btn-secondary flex items-center gap-2"
            title="Export PDF"
          >
            <FileText className="w-5 h-5" />
            PDF
          </button>
          <button 
            onClick={handleAdd}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Ajouter un {businessConfig.terminology.product.toLowerCase()}
          </button>
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
              placeholder="Rechercher par nom, code-barre..."
              className="input pl-10"
            />
          </div>
          
          {/* Sélecteur de catégorie */}
          <div className="relative min-w-[200px]">
            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
            <select
              value={selectedCategoryId || ''}
              onChange={(e) => setSelectedCategoryId(e.target.value ? parseInt(e.target.value) : null)}
              className="input pl-10 w-full appearance-none cursor-pointer pr-8"
            >
              <option value="">Toutes les catégories</option>
              {categories?.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            {selectedCategoryId && (
              <button
                onClick={() => setSelectedCategoryId(null)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
                title="Effacer le filtre"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>
          
          <button
            onClick={() => setShowLowStock(!showLowStock)}
            className={clsx(
              'btn flex items-center gap-2',
              showLowStock ? 'bg-yellow-100 text-yellow-700' : 'btn-secondary'
            )}
          >
            <AlertTriangle className="w-5 h-5" />
            Stock critique
          </button>
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

      {/* Products table */}
      <div className="card overflow-hidden p-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : products && products.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr className="text-left text-sm text-gray-500">
                  <th className="px-6 py-4 font-medium">{businessConfig.terminology.product}</th>
                  <th className="px-6 py-4 font-medium">Catégorie</th>
                  <th className="px-6 py-4 font-medium">Stock</th>
                  <th className="px-6 py-4 font-medium">Prix d'achat</th>
                  <th className="px-6 py-4 font-medium">Prix de vente</th>
                  {showExpiryDates && <th className="px-6 py-4 font-medium">Expiration</th>}
                  <th className="px-6 py-4 font-medium">Statut</th>
                  <th className="px-6 py-4 font-medium w-32">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                          <Package className="w-5 h-5 text-primary-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{product.name}</p>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            {product.barcode && <span>{product.barcode}</span>}
                            {showPrescriptions && product.is_prescription_required && (
                              <span className="badge badge-warning text-xs">Ordonnance</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {product.category ? (
                        <span className="badge badge-info">
                          {product.category.name}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={clsx(
                        'badge',
                        isLowStock(product) ? 'badge-danger' : 'badge-success'
                      )}>
                        {product.quantity} / {product.min_quantity}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {formatCurrency(product.purchase_price)}
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {formatCurrency(product.selling_price)}
                    </td>
                    {showExpiryDates && (
                    <td className="px-6 py-4">
                      {product.expiry_date ? (
                        <span className={clsx(
                          'badge',
                          isExpiringSoon(product) ? 'badge-warning' : 'badge-info'
                        )}>
                          {new Date(product.expiry_date).toLocaleDateString('fr-FR')}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    )}
                    <td className="px-6 py-4">
                      <span className={clsx(
                        'badge',
                        product.is_active ? 'badge-success' : 'badge-danger'
                      )}>
                        {product.is_active ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => handleEdit(product)}
                          className="p-2 hover:bg-gray-100 rounded-lg"
                          title="Modifier"
                        >
                          <Edit className="w-4 h-4 text-gray-500" />
                        </button>
                        <button 
                          onClick={() => handleDelete(product)}
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
            <p>Aucun {businessConfig.terminology.product.toLowerCase()} trouvé</p>
            <button onClick={handleAdd} className="mt-4 btn-primary">
              Ajouter un {businessConfig.terminology.product.toLowerCase()}
            </button>
          </div>
        )}
      </div>

      {/* Modal de formulaire */}
      <ProductFormModal
        isOpen={showFormModal}
        onClose={() => {
          setShowFormModal(false);
          setSelectedProduct(null);
        }}
        product={selectedProduct}
      />

      {/* Dialog de confirmation de suppression */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false);
          setProductToDelete(null);
        }}
        onConfirm={confirmDelete}
        title={`Supprimer le ${businessConfig.terminology.product.toLowerCase()}`}
        message={`Êtes-vous sûr de vouloir supprimer "${productToDelete?.name}" ? Cette action est irréversible.`}
        confirmText="Supprimer"
        type="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
