import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { api } from '@/services/api';
import { 
  History,
  RefreshCw,
  Search,
  FileText,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { CashSession, CashSessionStatus, CashRegister } from '@/types/cash';
import { exportToPDF, generateHTMLTable, formatCurrency } from '@/utils/exportUtils';
import Pagination, { usePagination } from '@/components/ui/Pagination';

export default function CashHistoryPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<CashSessionStatus | ''>('');
  const [cashRegisterFilter, setCashRegisterFilter] = useState<number | ''>('');

  // Récupérer la liste des caisses pour le filtre
  const { data: cashRegisters } = useQuery({
    queryKey: ['cash-registers-filter'],
    queryFn: async () => {
      const response = await api.get('/cash/registers');
      return response.data as CashRegister[];
    },
  });

  // Récupérer l'historique des sessions
  const { data: sessions, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['cash-sessions', statusFilter, cashRegisterFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) {
        params.append('status_filter', statusFilter);
      }
      if (cashRegisterFilter) {
        params.append('cash_register_id', cashRegisterFilter.toString());
      }
      const response = await api.get(`/cash/sessions?${params.toString()}`);
      return response.data as CashSession[];
    },
  });

  const filteredSessions = sessions?.filter(session => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      session.session_number.toLowerCase().includes(searchLower) ||
      session.opening_notes?.toLowerCase().includes(searchLower) ||
      session.closing_notes?.toLowerCase().includes(searchLower)
    );
  }) || [];

  // Pagination
  const {
    paginatedItems: paginatedSessions,
    currentPage,
    pageSize,
    totalPages,
    totalItems,
    handlePageChange,
    handlePageSizeChange,
  } = usePagination(filteredSessions, 20);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-GN').format(value) + ' GNF';
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR');
  };

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString('fr-FR');
  };

  const handleExportPDF = () => {
    if (!filteredSessions || filteredSessions.length === 0) {
      toast.error('Aucune session à exporter');
      return;
    }

    const totalSales = filteredSessions.reduce((sum, s) => sum + s.total_sales, 0);
    const totalDifference = filteredSessions.filter(s => s.total_difference !== null).reduce((sum, s) => sum + (s.total_difference || 0), 0);

    const content = `
      <p><strong>Date:</strong> ${new Date().toLocaleDateString('fr-FR')}</p>
      <p><strong>Total sessions:</strong> ${filteredSessions.length}</p>
      <p><strong>Total ventes:</strong> ${formatCurrency(totalSales)}</p>
      <p><strong>Écart total:</strong> ${formatCurrency(totalDifference)}</p>
      
      <h2 style="margin-top: 20px;">Historique des sessions</h2>
      ${generateHTMLTable(filteredSessions.filter(s => s.status === CashSessionStatus.CLOSED), [
        { key: 'session_number', label: 'N° Session' },
        { key: 'opening_date', label: 'Date ouverture', format: (v) => formatDateTime(v) },
        { key: 'opening_balance', label: 'Fond initial', format: (v) => formatCurrency(v) },
        { key: 'total_sales', label: 'Ventes', format: (v) => formatCurrency(v) },
        { key: 'closing_balance', label: 'Total fermé', format: (v) => v ? formatCurrency(v) : '-' },
        { key: 'total_difference', label: 'Écart', format: (v) => v !== null ? formatCurrency(v) : '-' },
      ])}
    `;

    exportToPDF('Historique des caisses', content, `historique-caisses-${new Date().toISOString().split('T')[0]}`);
    toast.success('Export PDF généré');
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
          <h1 className="text-2xl font-display font-bold text-gray-900">Historique des Caisses</h1>
          <p className="text-gray-500">
            {totalItems} session(s)
          </p>
        </div>
        <div className="flex gap-2">
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

      {/* Statistiques */}
      {sessions && sessions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Sessions totales</span>
              <History className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{sessions.length}</p>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Sessions ouvertes</span>
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {sessions.filter(s => s.status === CashSessionStatus.OPEN).length}
            </p>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Ventes totales</span>
              <TrendingUp className="w-5 h-5 text-primary-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(sessions.reduce((sum, s) => sum + s.total_sales, 0))}
            </p>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Écart total</span>
              <AlertTriangle className="w-5 h-5 text-orange-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(sessions.filter(s => s.total_difference !== null).reduce((sum, s) => sum + (s.total_difference || 0), 0))}
            </p>
          </div>
        </div>
      )}

      {/* Filtres */}
      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Recherche
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher par numéro, notes..."
                className="input pl-10"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Caisse
            </label>
            <select
              value={cashRegisterFilter}
              onChange={(e) => setCashRegisterFilter(e.target.value ? parseInt(e.target.value) : '')}
              className="input"
            >
              <option value="">Toutes les caisses</option>
              {cashRegisters?.map((register) => (
                <option key={register.id} value={register.id}>
                  {register.name} ({register.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Statut
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as CashSessionStatus | '')}
              className="input"
            >
              <option value="">Tous les statuts</option>
              <option value={CashSessionStatus.OPEN}>Ouvertes</option>
              <option value={CashSessionStatus.CLOSED}>Fermées</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>N° Session</th>
                <th>Statut</th>
                <th>Date ouverture</th>
                <th>Date fermeture</th>
                <th>Fond initial</th>
                <th>Ventes</th>
                <th>Total fermé</th>
                <th>Écart</th>
              </tr>
            </thead>
            <tbody>
              {filteredSessions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-gray-500">
                    Aucune session trouvée
                  </td>
                </tr>
              ) : (
                paginatedSessions.map((session) => (
                  <tr key={session.id}>
                    <td>
                      <span className="font-mono text-sm">{session.session_number}</span>
                    </td>
                    <td>
                      {session.status === CashSessionStatus.OPEN ? (
                        <span className="badge bg-green-100 text-green-800">Ouverte</span>
                      ) : (
                        <span className="badge bg-gray-100 text-gray-800">Fermée</span>
                      )}
                    </td>
                    <td>
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">
                          {formatDate(session.opening_date)}
                        </div>
                        <div className="text-gray-500">
                          {new Date(session.opening_date).toLocaleTimeString('fr-FR')}
                        </div>
                      </div>
                    </td>
                    <td>
                      {session.closing_date ? (
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">
                            {formatDate(session.closing_date)}
                          </div>
                          <div className="text-gray-500">
                            {new Date(session.closing_date).toLocaleTimeString('fr-FR')}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="text-gray-600">{formatCurrency(session.opening_balance)}</td>
                    <td className="font-medium text-green-600">{formatCurrency(session.total_sales)}</td>
                    <td className="font-medium text-gray-900">
                      {session.closing_balance !== null ? formatCurrency(session.closing_balance) : '-'}
                    </td>
                    <td>
                      {session.total_difference !== null ? (
                        <span className={`font-semibold ${
                          session.total_difference === 0 ? 'text-green-600' : 
                          Math.abs(session.total_difference) <= 1000 ? 'text-yellow-600' : 
                          'text-red-600'
                        }`}>
                          {session.total_difference > 0 ? '+' : ''}{formatCurrency(session.total_difference)}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
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
      </div>
    </div>
  );
}

