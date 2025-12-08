import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { 
  Plus, 
  Search, 
  RefreshCw,
  ShoppingCart,
  Eye,
  Calendar,
  Printer,
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import SaleDetailsModal from '@/components/sales/SaleDetailsModal';
import Pagination, { usePagination } from '@/components/ui/Pagination';

interface SaleItem {
  id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  discount: number;
  total: number;
  product?: {
    id: number;
    name: string;
    barcode?: string;
  };
}

interface Sale {
  id: number;
  sale_number: string;
  customer_id: number | null;
  user_id: number;
  total_amount: number;
  discount: number;
  tax: number;
  final_amount: number;
  payment_method: string;
  status: string;
  notes: string | null;
  created_at: string;
  items: SaleItem[];
}

export default function SalesPage() {
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Récupérer les ventes
  const { data: sales, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['sales', search, dateRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange.start) params.append('start_date', dateRange.start);
      if (dateRange.end) params.append('end_date', dateRange.end);
      const response = await api.get(`/sales?${params}`);
      return response.data as Sale[];
    },
  });

  const handleRefresh = () => {
    refetch();
    toast.success('Liste actualisée');
  };

  const handleViewSale = (sale: Sale) => {
    setSelectedSale(sale);
    setShowDetailsModal(true);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-GN').format(value) + ' GNF';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return 'badge-success';
      case 'pending':
        return 'badge-warning';
      case 'cancelled':
        return 'badge-danger';
      case 'refunded':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'badge-info';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Complétée';
      case 'pending':
        return 'En attente';
      case 'cancelled':
        return 'Annulée';
      case 'refunded':
        return 'Remboursée';
      default:
        return status;
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'cash':
        return 'Espèces';
      case 'card':
        return 'Carte';
      case 'mobile_money':
        return 'Mobile Money';
      case 'credit':
        return 'Crédit';
      default:
        return method;
    }
  };

  // Filter sales by search
  const filteredSales = sales?.filter(sale => 
    sale.sale_number.toLowerCase().includes(search.toLowerCase())
  ) || [];

  // Pagination
  const {
    paginatedItems: paginatedSales,
    currentPage,
    pageSize,
    totalPages,
    totalItems,
    handlePageChange,
    handlePageSizeChange,
  } = usePagination(filteredSales, 20);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Ventes</h1>
          <p className="text-gray-500">{totalItems} vente(s)</p>
        </div>
        <Link to="/sales/new" className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Nouvelle vente
        </Link>
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
              placeholder="Rechercher par N° de vente..."
              className="input pl-10"
            />
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="input pl-10"
              />
            </div>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="input pl-10"
              />
            </div>
            <button
              onClick={handleRefresh}
              disabled={isFetching}
              className="btn-secondary flex items-center gap-2"
            >
              <RefreshCw className={clsx('w-5 h-5', isFetching && 'animate-spin')} />
            </button>
          </div>
        </div>
      </div>

      {/* Sales table */}
      <div className="card overflow-hidden p-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : filteredSales && filteredSales.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr className="text-left text-sm text-gray-500">
                  <th className="px-6 py-4 font-medium">N° Vente</th>
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium">Articles</th>
                  <th className="px-6 py-4 font-medium">Total</th>
                  <th className="px-6 py-4 font-medium">Paiement</th>
                  <th className="px-6 py-4 font-medium">Statut</th>
                  <th className="px-6 py-4 font-medium w-32">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <ShoppingCart className="w-5 h-5 text-blue-600" />
                        </div>
                        <span className="font-medium text-gray-900">{sale.sale_number}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {new Date(sale.created_at).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {sale.items?.length || 0} article(s)
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {formatCurrency(sale.final_amount)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="badge badge-info">
                        {getPaymentMethodLabel(sale.payment_method)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={clsx('badge', getStatusBadge(sale.status))}>
                        {getStatusLabel(sale.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => handleViewSale(sale)}
                          className="p-2 hover:bg-gray-100 rounded-lg"
                          title="Voir les détails"
                        >
                          <Eye className="w-4 h-4 text-gray-500" />
                        </button>
                        <button 
                          onClick={() => handleViewSale(sale)}
                          className="p-2 hover:bg-gray-100 rounded-lg"
                          title="Imprimer le ticket"
                        >
                          <Printer className="w-4 h-4 text-gray-500" />
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
            <ShoppingCart className="w-12 h-12 mb-4 text-gray-300" />
            <p>Aucune vente trouvée</p>
            <Link to="/sales/new" className="mt-4 btn-primary">
              Créer une vente
            </Link>
          </div>
        )}
      </div>

      {/* Sale Details Modal */}
      <SaleDetailsModal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedSale(null);
        }}
        sale={selectedSale}
      />
    </div>
  );
}
