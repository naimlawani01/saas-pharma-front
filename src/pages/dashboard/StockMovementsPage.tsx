import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { api } from '@/services/api';
import { 
  ArrowDownCircle, 
  ArrowUpCircle,
  RefreshCw,
  Search,
  FileText,
  FileSpreadsheet,
  Package,
  Calendar,
  Tag,
} from 'lucide-react';
import { StockMovement, MovementType } from '@/types/stock';
import { exportToPDF, exportToExcel, generateHTMLTable } from '@/utils/exportUtils';
import Pagination, { usePagination } from '@/components/ui/Pagination';
import clsx from 'clsx';

const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
  [MovementType.SALE]: 'Vente',
  [MovementType.PURCHASE]: 'Achat',
  [MovementType.ADJUSTMENT]: 'Ajustement',
  [MovementType.RETURN]: 'Retour',
  [MovementType.EXPIRY]: 'Expiration',
  [MovementType.DAMAGE]: 'Dommage',
  [MovementType.LOSS]: 'Perte',
  [MovementType.TRANSFER]: 'Transfert',
};

const MOVEMENT_TYPE_COLORS: Record<MovementType, string> = {
  [MovementType.SALE]: 'bg-red-100 text-red-800 border-red-200',
  [MovementType.PURCHASE]: 'bg-green-100 text-green-800 border-green-200',
  [MovementType.ADJUSTMENT]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  [MovementType.RETURN]: 'bg-blue-100 text-blue-800 border-blue-200',
  [MovementType.EXPIRY]: 'bg-red-100 text-red-800 border-red-200',
  [MovementType.DAMAGE]: 'bg-orange-100 text-orange-800 border-orange-200',
  [MovementType.LOSS]: 'bg-red-100 text-red-800 border-red-200',
  [MovementType.TRANSFER]: 'bg-purple-100 text-purple-800 border-purple-200',
};


const REFERENCE_TYPE_LABELS: Record<string, string> = {
  'sale': 'Vente',
  'adjustment': 'Ajustement',
  'inventory': 'Inventaire',
  'supplier_order': 'Commande fournisseur',
  'supplier_order_return': 'Retour fournisseur',
};

export default function StockMovementsPage() {
  const [search, setSearch] = useState('');
  const [movementTypeFilter, setMovementTypeFilter] = useState<MovementType | ''>('');

  // Récupérer les mouvements
  const { data: movements, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['stock-movements', movementTypeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (movementTypeFilter) {
        params.append('movement_type', movementTypeFilter);
      }
      const response = await api.get(`/stock/movements?${params.toString()}`);
      return response.data as StockMovement[];
    },
  });

  const filteredMovements = movements?.filter(movement => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      movement.product_id.toString().includes(searchLower) ||
      movement.product?.name?.toLowerCase().includes(searchLower) ||
      movement.notes?.toLowerCase().includes(searchLower) ||
      MOVEMENT_TYPE_LABELS[movement.movement_type].toLowerCase().includes(searchLower)
    );
  }) || [];

  // Pagination
  const {
    paginatedItems: paginatedMovements,
    currentPage,
    pageSize,
    totalPages,
    totalItems,
    handlePageChange,
    handlePageSizeChange,
  } = usePagination(filteredMovements, 20);

  const handleExportPDF = () => {
    if (!filteredMovements || filteredMovements.length === 0) {
      toast.error('Aucun mouvement à exporter');
      return;
    }

    const content = `
      <p><strong>Date:</strong> ${new Date().toLocaleDateString('fr-FR')}</p>
      <p><strong>Total mouvements:</strong> ${filteredMovements.length}</p>
      
      <h2 style="margin-top: 20px;">Historique des mouvements</h2>
      ${generateHTMLTable(filteredMovements, [
        { key: 'created_at', label: 'Date', format: (v) => new Date(v).toLocaleDateString('fr-FR') + ' ' + new Date(v).toLocaleTimeString('fr-FR') },
        { key: 'product.name', label: 'Produit', format: (_v, item) => item.product?.name || `Produit #${item.product_id}` },
        { key: 'movement_type', label: 'Type', format: (v) => MOVEMENT_TYPE_LABELS[v as MovementType] },
        { key: 'quantity', label: 'Quantité' },
        { key: 'quantity_before', label: 'Avant' },
        { key: 'quantity_after', label: 'Après' },
        { key: 'reference_type', label: 'Référence', format: (v, item) => {
          if (v && item.reference_id) {
            return `${REFERENCE_TYPE_LABELS[v] || v} #${item.reference_id}`;
          }
          return '-';
        }},
        { key: 'notes', label: 'Notes', format: (v) => v || '-' },
      ])}
    `;

    exportToPDF('Historique des mouvements de stock', content, `mouvements-stock-${new Date().toISOString().split('T')[0]}`);
    toast.success('Export PDF généré');
  };

  const handleExportExcel = () => {
    if (!filteredMovements || filteredMovements.length === 0) {
      toast.error('Aucun mouvement à exporter');
      return;
    }

    const data = filteredMovements.map(m => ({
      'Date': new Date(m.created_at).toLocaleDateString('fr-FR'),
      'Heure': new Date(m.created_at).toLocaleTimeString('fr-FR'),
      'Produit': m.product?.name || `Produit #${m.product_id}`,
      'Type': MOVEMENT_TYPE_LABELS[m.movement_type],
      'Quantité': m.quantity,
      'Stock Avant': m.quantity_before,
      'Stock Après': m.quantity_after,
      'Référence': m.reference_type && m.reference_id 
        ? `${REFERENCE_TYPE_LABELS[m.reference_type] || m.reference_type} #${m.reference_id}`
        : '-',
      'Notes': m.notes || '-',
    }));

    exportToExcel(data, `mouvements-stock-${new Date().toISOString().split('T')[0]}`);
    toast.success('Export Excel généré');
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
          <h1 className="text-2xl font-display font-bold text-gray-900">Historique des Mouvements</h1>
          <p className="text-gray-500 mt-1">
            {totalItems} mouvement(s) de stock
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
            onClick={() => refetch()} 
            disabled={isFetching}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw className={`w-5 h-5 ${isFetching ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>
      </div>

      {/* Filtres */}
      <div className="card p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Recherche
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher par produit, notes..."
                className="input pl-10 w-full"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Type de mouvement
            </label>
            <select
              value={movementTypeFilter}
              onChange={(e) => setMovementTypeFilter(e.target.value as MovementType | '')}
              className="input w-full"
            >
              <option value="">Tous les types</option>
              {Object.entries(MOVEMENT_TYPE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        {filteredMovements.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500">
            <Package className="w-16 h-16 text-gray-300 mb-4" />
            <p className="text-lg font-medium">Aucun mouvement de stock trouvé</p>
            <p className="text-sm mt-1">Les mouvements apparaîtront ici après vos opérations</p>
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
                      <Tag className="w-4 h-4" />
                      Type
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      Produit
                    </div>
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Quantité
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Stock Avant
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Stock Après
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Référence
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {paginatedMovements.map((movement) => (
                  <tr 
                    key={movement.id} 
                    className="hover:bg-gray-50 transition-colors duration-150"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <div className="font-semibold text-gray-900">
                          {new Date(movement.created_at).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </div>
                        <div className="text-gray-500 text-xs mt-0.5">
                          {new Date(movement.created_at).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1.5">
                        <span className={clsx(
                          'badge text-xs font-semibold border',
                          MOVEMENT_TYPE_COLORS[movement.movement_type]
                        )}>
                          {MOVEMENT_TYPE_LABELS[movement.movement_type]}
                        </span>
                        {movement.movement_type === 'adjustment' && movement.notes && movement.notes.startsWith('Raison:') && (
                          <span className="text-xs text-blue-700 font-medium bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                            {movement.notes.split(' - ')[0].replace('Raison: ', '')}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Package className="w-5 h-5 text-primary-600" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-gray-900 truncate">
                            {movement.product?.name || `Produit #${movement.product_id}`}
                          </div>
                          {movement.product?.barcode && (
                            <div className="text-xs text-gray-500 mt-0.5">
                              {movement.product.barcode}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {movement.quantity > 0 ? (
                          <ArrowUpCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <ArrowDownCircle className="w-5 h-5 text-red-600" />
                        )}
                        <span className={clsx(
                          'font-bold text-sm',
                          movement.quantity > 0 ? 'text-green-600' : 'text-red-600'
                        )}>
                          {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-sm font-medium text-gray-600 bg-gray-50 px-3 py-1 rounded-md">
                        {movement.quantity_before}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-sm font-bold text-gray-900 bg-primary-50 px-3 py-1 rounded-md">
                        {movement.quantity_after}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {movement.reference_type && movement.reference_id ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
                          {REFERENCE_TYPE_LABELS[movement.reference_type] || movement.reference_type} #{movement.reference_id}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600 max-w-xs">
                        {movement.notes ? (
                          <div className="truncate" title={movement.notes}>
                            {movement.notes.split(' - ').length > 1 
                              ? movement.notes.split(' - ').slice(1).join(' - ')
                              : movement.notes.replace('Raison: ', '')
                            }
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
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
        )}
      </div>
    </div>
  );
}
