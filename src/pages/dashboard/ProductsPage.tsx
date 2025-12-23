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
      // Augmenter la limite pour charger tous les produits (ou au moins beaucoup plus)
      params.append('limit', '10000'); // Limite très élevée pour charger tous les produits
      params.append('skip', '0');
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900">{businessConfig.terminology.productPlural}</h1>
          <p className="text-slate-500 mt-1">
            {products?.length || 0} {businessConfig.terminology.product.toLowerCase()}(s) dans l'inventaire
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={handleExportExcel}
            className="btn-secondary"
            title="Export Excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden sm:inline">Excel</span>
          </button>
          <button 
            onClick={handleExportPDF}
            className="btn-secondary"
            title="Export PDF"
          >
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">PDF</span>
          </button>
          <button 
            onClick={handleAdd}
            className="btn-primary"
          >
            <Plus className="w-4 h-4" />
            Ajouter
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-5 shadow-lg shadow-slate-200/50 border border-slate-100">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par nom, code-barre..."
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all placeholder:text-slate-400"
            />
          </div>
          
          {/* Sélecteur de catégorie */}
          <div className="relative min-w-[200px]">
            <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
            <select
              value={selectedCategoryId || ''}
              onChange={(e) => setSelectedCategoryId(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full pl-11 pr-10 py-3 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all appearance-none cursor-pointer text-slate-700"
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
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 rounded-lg transition-colors"
                title="Effacer le filtre"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            )}
          </div>
          
          <button
            onClick={() => setShowLowStock(!showLowStock)}
            className={clsx(
              'px-4 py-3 rounded-xl font-medium transition-all flex items-center gap-2',
              showLowStock 
                ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-500' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            <AlertTriangle className="w-4 h-4" />
            <span className="hidden sm:inline">Stock critique</span>
          </button>
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

      {/* Products table */}
      <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-purple-600 border-t-transparent"></div>
              <p className="text-sm text-slate-500">Chargement...</p>
            </div>
          </div>
        ) : products && products.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{businessConfig.terminology.product}</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Catégorie</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Stock</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Prix d'achat</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Prix de vente</th>
                  {showExpiryDates && <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Expiration</th>}
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Ordonnance</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Statut</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {paginatedProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-xl flex items-center justify-center shadow-sm">
                          <Package className="w-5 h-5 text-purple-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-slate-900">{product.name}</p>
                            {product.is_prescription_required && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium bg-amber-50 text-amber-700">
                                <AlertTriangle className="w-3 h-3" />
                                Ordonnance
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-slate-500 mt-0.5">
                            {product.barcode && <span className="font-mono text-xs">{product.barcode}</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {product.category ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-50 text-blue-700">
                          {product.category.name}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={clsx(
                        'inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold',
                        isLowStock(product) 
                          ? 'bg-red-50 text-red-700' 
                          : 'bg-emerald-50 text-emerald-700'
                      )}>
                        {product.quantity} / {product.min_quantity}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium">
                      {formatCurrency(product.purchase_price)}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      {formatCurrency(product.selling_price)}
                    </td>
                    {showExpiryDates && (
                    <td className="px-6 py-4">
                      {product.expiry_date ? (
                        <span className={clsx(
                          'inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium',
                          isExpiringSoon(product) 
                            ? 'bg-amber-50 text-amber-700' 
                            : 'bg-blue-50 text-blue-700'
                        )}>
                          {new Date(product.expiry_date).toLocaleDateString('fr-FR')}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    )}
                    <td className="px-6 py-4">
                      {product.is_prescription_required ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-50 text-amber-700">
                          <AlertTriangle className="w-3 h-3" />
                          Oui
                        </span>
                      ) : (
                        <span className="text-slate-400 text-sm">Non</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={clsx(
                        'inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium',
                        product.is_active 
                          ? 'bg-emerald-50 text-emerald-700' 
                          : 'bg-red-50 text-red-700'
                      )}>
                        {product.is_active ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleEdit(product)}
                          className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                          title="Modifier"
                        >
                          <Edit className="w-4 h-4 text-slate-500" />
                        </button>
                        <button 
                          onClick={() => handleDelete(product)}
                          className="p-2 hover:bg-red-50 rounded-xl transition-colors"
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
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
              <Package className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-lg font-medium text-slate-700 mb-1">
              Aucun {businessConfig.terminology.product.toLowerCase()} trouvé
            </p>
            <p className="text-sm text-slate-500 mb-6">
              Commencez par ajouter votre premier {businessConfig.terminology.product.toLowerCase()}
            </p>
            <button onClick={handleAdd} className="btn-primary">
              <Plus className="w-4 h-4" />
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
