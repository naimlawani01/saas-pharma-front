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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900">Ventes</h1>
          <p className="text-slate-500 mt-1">{totalItems} vente(s)</p>
        </div>
        <Link to="/sales/new" className="btn-primary">
          <Plus className="w-4 h-4" />
          Nouvelle vente
        </Link>
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
              placeholder="Rechercher par N° de vente..."
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all placeholder:text-slate-400"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="pl-11 pr-4 py-3 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all text-slate-700"
              />
            </div>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="pl-11 pr-4 py-3 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all text-slate-700"
              />
            </div>
            <button
              onClick={handleRefresh}
              disabled={isFetching}
              className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={clsx('w-4 h-4', isFetching && 'animate-spin')} />
            </button>
          </div>
        </div>
      </div>

      {/* Sales table */}
      <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-purple-600 border-t-transparent"></div>
              <p className="text-sm text-slate-500">Chargement...</p>
            </div>
          </div>
        ) : filteredSales && filteredSales.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">N° Vente</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Articles</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Paiement</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Statut</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {paginatedSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center shadow-sm">
                          <ShoppingCart className="w-5 h-5 text-blue-600" />
                        </div>
                        <span className="font-semibold text-slate-900">{sale.sale_number}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 text-sm">
                      {new Date(sale.created_at).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {sale.items?.length || 0} article(s)
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      {formatCurrency(sale.final_amount)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-50 text-blue-700">
                        {getPaymentMethodLabel(sale.payment_method)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={clsx(
                        'inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium',
                        sale.status === 'completed' && 'bg-emerald-50 text-emerald-700',
                        sale.status === 'pending' && 'bg-amber-50 text-amber-700',
                        sale.status === 'cancelled' && 'bg-red-50 text-red-700',
                        sale.status === 'refunded' && 'bg-purple-50 text-purple-700',
                        !['completed', 'pending', 'cancelled', 'refunded'].includes(sale.status) && 'bg-slate-50 text-slate-700'
                      )}>
                        {getStatusLabel(sale.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleViewSale(sale)}
                          className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                          title="Voir les détails"
                        >
                          <Eye className="w-4 h-4 text-slate-500" />
                        </button>
                        <button 
                          onClick={() => handleViewSale(sale)}
                          className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                          title="Imprimer le ticket"
                        >
                          <Printer className="w-4 h-4 text-slate-500" />
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
              <ShoppingCart className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-lg font-medium text-slate-700 mb-1">Aucune vente trouvée</p>
            <p className="text-sm text-slate-500 mb-6">Commencez par créer votre première vente</p>
            <Link to="/sales/new" className="btn-primary">
              <Plus className="w-4 h-4" />
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
