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
  Clock,
  DollarSign,
  Calculator,
  Eye,
  Calendar,
} from 'lucide-react';
import { CashSession, CashSessionStatus, CashRegister } from '@/types/cash';
import { exportToPDF, generateHTMLTable } from '@/utils/exportUtils';
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

      {/* Sessions List - Design moderne en cartes */}
      {filteredSessions.length === 0 ? (
        <div className="card p-12 text-center">
          <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">Aucune session trouvée</p>
        </div>
      ) : (
        <div className="space-y-4">
          {paginatedSessions.map((session) => {
            const isOpen = session.status === CashSessionStatus.OPEN;
            const duration = session.closing_date 
              ? Math.round((new Date(session.closing_date).getTime() - new Date(session.opening_date).getTime()) / (1000 * 60))
              : Math.round((new Date().getTime() - new Date(session.opening_date).getTime()) / (1000 * 60));
            
            return (
              <div
                key={session.id}
                className="card p-6 hover:shadow-lg transition-shadow border-l-4 border-l-primary-500"
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                  {/* Left Section - Info principale */}
                  <div className="flex-1 space-y-4">
                    {/* Header avec numéro et statut */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                          isOpen ? 'bg-green-100' : 'bg-gray-100'
                        }`}>
                          <Calculator className={`w-6 h-6 ${
                            isOpen ? 'text-green-600' : 'text-gray-600'
                          }`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900">
                              Session #{session.session_number}
                            </h3>
                            {isOpen ? (
                              <span className="badge bg-green-100 text-green-800 border-green-200 flex items-center gap-1">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                Ouverte
                              </span>
                            ) : (
                              <span className="badge bg-gray-100 text-gray-800 border-gray-200">
                                Fermée
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            {cashRegisters?.find(r => r.id === session.cash_register_id)?.name || 'Caisse inconnue'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                          <Calendar className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Ouverture</p>
                          <p className="font-medium text-gray-900">
                            {formatDate(session.opening_date)}
                          </p>
                          <p className="text-sm text-gray-500">
                            {new Date(session.opening_date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>

                      {session.closing_date ? (
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                            <CheckCircle className="w-5 h-5 text-purple-600" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Fermeture</p>
                            <p className="font-medium text-gray-900">
                              {formatDate(session.closing_date)}
                            </p>
                            <p className="text-sm text-gray-500">
                              {new Date(session.closing_date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
                            <Clock className="w-5 h-5 text-orange-600" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Durée</p>
                            <p className="font-medium text-gray-900">
                              {duration >= 60 ? `${Math.floor(duration / 60)}h ${duration % 60}min` : `${duration}min`}
                            </p>
                            <p className="text-sm text-gray-500">En cours</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Section - Montants */}
                  <div className="lg:w-80 space-y-3">
                    {/* Fond initial */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-600">Fond initial</span>
                      </div>
                      <span className="font-semibold text-gray-900">
                        {formatCurrency(session.opening_balance)}
                      </span>
                    </div>

                    {/* Ventes */}
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-gray-700">Ventes</span>
                      </div>
                      <span className="font-semibold text-green-700">
                        {formatCurrency(session.total_sales)}
                      </span>
                    </div>

                    {/* Total fermé */}
                    {session.closing_balance !== null && (
                      <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Calculator className="w-4 h-4 text-blue-600" />
                          <span className="text-sm text-gray-700">Total fermé</span>
                        </div>
                        <span className="font-semibold text-blue-700">
                          {formatCurrency(session.closing_balance)}
                        </span>
                      </div>
                    )}

                    {/* Écart */}
                    {session.total_difference !== null && (
                      <div className={`flex items-center justify-between p-3 rounded-lg ${
                        session.total_difference === 0 
                          ? 'bg-green-50' 
                          : Math.abs(session.total_difference) <= 1000 
                            ? 'bg-yellow-50' 
                            : 'bg-red-50'
                      }`}>
                        <div className="flex items-center gap-2">
                          {session.total_difference === 0 ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <AlertTriangle className={`w-4 h-4 ${
                              Math.abs(session.total_difference) <= 1000 ? 'text-yellow-600' : 'text-red-600'
                            }`} />
                          )}
                          <span className="text-sm text-gray-700">Écart</span>
                        </div>
                        <span className={`font-bold ${
                          session.total_difference === 0 
                            ? 'text-green-700' 
                            : Math.abs(session.total_difference) <= 1000 
                              ? 'text-yellow-700' 
                              : 'text-red-700'
                        }`}>
                          {session.total_difference > 0 ? '+' : ''}{formatCurrency(session.total_difference)}
                        </span>
                      </div>
                    )}

                    {/* Stats supplémentaires */}
                    {session.sales_count > 0 && (
                      <div className="pt-2 border-t border-gray-200">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Nombre de ventes</span>
                          <span className="font-medium text-gray-700">{session.sales_count}</span>
                        </div>
                        {session.total_refunds > 0 && (
                          <div className="flex items-center justify-between text-sm mt-1">
                            <span className="text-gray-500">Remboursements</span>
                            <span className="font-medium text-red-600">-{formatCurrency(session.total_refunds)}</span>
                          </div>
                        )}
                        {session.total_expenses > 0 && (
                          <div className="flex items-center justify-between text-sm mt-1">
                            <span className="text-gray-500">Dépenses</span>
                            <span className="font-medium text-orange-600">-{formatCurrency(session.total_expenses)}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Notes si présentes */}
                {(session.opening_notes || session.closing_notes) && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    {session.opening_notes && (
                      <div className="mb-2">
                        <p className="text-xs text-gray-500 mb-1">Note d'ouverture</p>
                        <p className="text-sm text-gray-700">{session.opening_notes}</p>
                      </div>
                    )}
                    {session.closing_notes && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Note de fermeture</p>
                        <p className="text-sm text-gray-700">{session.closing_notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Pagination */}
          {totalItems > 0 && (
            <div className="mt-6">
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
        </div>
      )}
    </div>
  );
}

