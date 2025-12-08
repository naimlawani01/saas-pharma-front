import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { 
  BarChart3,
  TrendingUp,
  Download,
  Calendar,
  DollarSign,
  Package,
  Users,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { exportToCSV, exportToPDF, generateHTMLTable, formatCurrency as formatCurrencyExport } from '@/utils/exportUtils';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
} from 'recharts';
import clsx from 'clsx';

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function ReportsPage() {
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('week');
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  const [showAllCustomers, setShowAllCustomers] = useState(false);

  // Ventes par période
  const { data: salesByPeriod } = useQuery({
    queryKey: ['sales-by-period', period, dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        group_by: period,
        start_date: dateRange.start,
        end_date: dateRange.end,
      });
      const response = await api.get(`/reports/sales-by-period?${params}`);
      return response.data;
    },
  });

  // Ventes par mode de paiement
  const { data: salesByPayment } = useQuery({
    queryKey: ['sales-by-payment', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        start_date: dateRange.start,
        end_date: dateRange.end,
      });
      const response = await api.get(`/reports/sales-by-payment-method?${params}`);
      return response.data;
    },
  });

  // Top produits
  const { data: topProducts } = useQuery({
    queryKey: ['top-products', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        start_date: dateRange.start,
        end_date: dateRange.end,
        limit: '10',
      });
      const response = await api.get(`/reports/top-products?${params}`);
      return response.data;
    },
  });

  // Top clients - Utilise la même période que les autres graphiques ou toutes les ventes
  const { data: topCustomers, isLoading: isLoadingCustomers, isFetching: isFetchingCustomers } = useQuery({
    queryKey: ['top-customers', dateRange, showAllCustomers],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: '5',
      });
      // Si showAllCustomers est false, utiliser les dates de la période sélectionnée
      if (!showAllCustomers) {
        if (dateRange.start) {
          params.append('start_date', dateRange.start);
        }
        if (dateRange.end) {
          params.append('end_date', dateRange.end);
        }
      }
      // Si showAllCustomers est true, ne pas envoyer de dates = toutes les ventes
      const response = await api.get(`/reports/top-customers?${params}`);
      return response.data;
    },
    // Forcer le rafraîchissement quand les filtres changent
    refetchOnWindowFocus: false,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-GN').format(value) + ' GNF';
  };

  const paymentMethodLabels: Record<string, string> = {
    cash: 'Espèces',
    card: 'Carte',
    mobile_money: 'Mobile Money',
    credit: 'Crédit',
  };

  // Export functions
  const handleExportPDF = () => {
    if (!salesByPeriod || salesByPeriod.length === 0) {
      toast.error('Aucune donnée à exporter');
      return;
    }

    const content = `
      <p><strong>Période:</strong> ${dateRange.start} au ${dateRange.end}</p>
      
      <h2 style="margin-top: 20px;">Ventes par période</h2>
      ${generateHTMLTable(salesByPeriod, [
        { key: 'period', label: 'Période' },
        { key: 'count', label: 'Nombre' },
        { key: 'total', label: 'Total', format: (v) => formatCurrencyExport(v) },
      ])}

      ${topProducts && topProducts.length > 0 ? `
        <h2 style="margin-top: 20px;">Top produits</h2>
        ${generateHTMLTable(topProducts, [
          { key: 'product_name', label: 'Produit' },
          { key: 'total_quantity', label: 'Quantité' },
          { key: 'total_revenue', label: 'CA', format: (v) => formatCurrencyExport(v) },
        ])}
      ` : ''}

      ${topCustomers && topCustomers.length > 0 ? `
        <h2 style="margin-top: 20px;">Top clients</h2>
        ${generateHTMLTable(topCustomers, [
          { key: 'name', label: 'Client' },
          { key: 'purchase_count', label: 'Achats' },
          { key: 'total_spent', label: 'Total', format: (v) => formatCurrencyExport(v) },
        ])}
      ` : ''}
    `;

    exportToPDF(`Rapport des ventes (${dateRange.start} - ${dateRange.end})`, content, 'rapport-ventes');
    toast.success('Export PDF généré');
  };

  const handleExportExcel = () => {
    if (!salesByPeriod || salesByPeriod.length === 0) {
      toast.error('Aucune donnée à exporter');
      return;
    }

    const data = salesByPeriod.map((item: any) => ({
      'Période': item.period,
      'Nombre de ventes': item.count,
      'Total (GNF)': item.total,
    }));

    exportToCSV(data, `rapport-ventes-${dateRange.start}-${dateRange.end}`);
    toast.success('Export Excel généré');
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Rapports</h1>
          <p className="text-gray-500">Analysez les performances de votre pharmacie</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportExcel} className="btn-secondary flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Excel
          </button>
          <button onClick={handleExportPDF} className="btn-primary flex items-center gap-2">
            <FileText className="w-5 h-5" />
            PDF
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex gap-2">
            {(['day', 'week', 'month'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={clsx(
                  'btn',
                  period === p ? 'btn-primary' : 'btn-secondary'
                )}
              >
                {p === 'day' ? 'Jour' : p === 'week' ? 'Semaine' : 'Mois'}
              </button>
            ))}
          </div>
          <div className="flex gap-2 sm:ml-auto">
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
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Évolution des ventes - Amélioré */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary-600" />
              <div>
                <h3 className="font-semibold text-gray-900 text-lg">Évolution des ventes</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  {period === 'day' ? 'Par jour' : period === 'week' ? 'Par semaine' : 'Par mois'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                <span className="text-gray-600">Montant</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                <span className="text-gray-600">Nombre</span>
              </div>
            </div>
          </div>
          <div className="h-80">
            {salesByPeriod && salesByPeriod.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesByPeriod} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis 
                    dataKey="period" 
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => {
                      if (!value) return '';
                      const date = new Date(value);
                      if (isNaN(date.getTime())) return value;
                      if (period === 'day') {
                        return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
                      } else if (period === 'week') {
                        const weekNum = Math.ceil(date.getDate() / 7);
                        return `S${weekNum}`;
                      } else {
                        return date.toLocaleDateString('fr-FR', { month: 'short' });
                      }
                    }}
                  />
                  <YAxis 
                    yAxisId="left" 
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => {
                      if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                      if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                      return value.toString();
                    }}
                  />
                  <YAxis 
                    yAxisId="right" 
                    orientation="right" 
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      padding: '12px',
                    }}
                    formatter={(value: number, name: string) => [
                      name === 'Montant' ? formatCurrency(value) : `${value} ventes`,
                      name
                    ]}
                    labelFormatter={(label) => {
                      if (!label) return '';
                      const date = new Date(label);
                      if (isNaN(date.getTime())) return label;
                      return date.toLocaleDateString('fr-FR', { 
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      });
                    }}
                  />
                  <Legend 
                    wrapperStyle={{ paddingTop: '20px' }}
                    iconType="circle"
                    formatter={(value) => value === 'total' ? 'Montant (GNF)' : 'Nombre de ventes'}
                  />
                  <Area 
                    name="total"
                    type="monotone" 
                    dataKey="total" 
                    stroke="#22c55e" 
                    strokeWidth={3}
                    fill="url(#colorTotal)"
                    yAxisId="left"
                    dot={{ fill: '#22c55e', strokeWidth: 2, r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                  <Line 
                    name="count"
                    type="monotone" 
                    dataKey="count" 
                    stroke="#3b82f6" 
                    strokeWidth={2.5}
                    yAxisId="right"
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center">
                  <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Aucune donnée disponible</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Ventes par mode de paiement - Amélioré */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-blue-600" />
              <div>
                <h3 className="font-semibold text-gray-900 text-lg">Par mode de paiement</h3>
                <p className="text-sm text-gray-500 mt-0.5">Répartition des ventes</p>
              </div>
            </div>
          </div>
          <div className="h-80">
            {salesByPayment && salesByPayment.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={salesByPayment.map((item: any) => ({
                      ...item,
                      name: paymentMethodLabels[item.payment_method] || item.payment_method,
                    }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={3}
                    dataKey="total"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {salesByPayment.map((_: any, index: number) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={COLORS[index % COLORS.length]}
                        stroke="#fff"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      padding: '12px',
                    }}
                    formatter={(value: number, name: string, props: any) => {
                      const total = salesByPayment.reduce((sum: number, item: any) => sum + item.total, 0);
                      const percent = ((value / total) * 100).toFixed(1);
                      return [
                        `${formatCurrency(value)} (${percent}%)`,
                        props.payload.name
                      ];
                    }}
                  />
                  <Legend 
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                    wrapperStyle={{ paddingTop: '20px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center">
                  <DollarSign className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Aucune donnée disponible</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Top produits - Amélioré */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-purple-600" />
              <div>
                <h3 className="font-semibold text-gray-900 text-lg">Top produits vendus</h3>
                <p className="text-sm text-gray-500 mt-0.5">Top 10</p>
              </div>
            </div>
          </div>
          <div className="h-80">
            {topProducts && topProducts.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={topProducts} 
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <defs>
                    <linearGradient id="colorProductBar" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={1}/>
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={true} vertical={false} />
                  <XAxis 
                    type="number" 
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="product_name" 
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    width={140}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      padding: '12px',
                    }}
                    formatter={(value: number, _name: string, props: any) => [
                      `${value} unités vendues`,
                      props.payload.product_name
                    ]}
                  />
                  <Bar 
                    dataKey="total_quantity" 
                    fill="url(#colorProductBar)" 
                    radius={[0, 8, 8, 0]}
                    animationDuration={800}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center">
                  <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Aucune donnée disponible</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Top clients - Amélioré */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-orange-600" />
              <div>
                <h3 className="font-semibold text-gray-900 text-lg">Meilleurs clients</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  Top 5 {showAllCustomers 
                    ? '(Toutes les ventes)' 
                    : dateRange.start && dateRange.end 
                      ? `(${new Date(dateRange.start).toLocaleDateString('fr-FR')} - ${new Date(dateRange.end).toLocaleDateString('fr-FR')})`
                      : '(Toutes les ventes)'}
                  {isFetchingCustomers && (
                    <span className="ml-2 text-primary-600 animate-pulse">⏳ Chargement...</span>
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowAllCustomers(!showAllCustomers)}
              disabled={isFetchingCustomers}
              className={clsx(
                'text-xs px-3 py-1.5 rounded-lg font-medium transition-colors',
                showAllCustomers
                  ? 'bg-primary-100 text-primary-700 hover:bg-primary-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                isFetchingCustomers && 'opacity-50 cursor-not-allowed'
              )}
              title={showAllCustomers ? 'Utiliser la période sélectionnée' : 'Voir toutes les ventes'}
            >
              {showAllCustomers ? 'Période' : 'Tout'}
            </button>
          </div>
          <div className="space-y-3">
            {isLoadingCustomers ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            ) : topCustomers && topCustomers.length > 0 ? (
              <>
                {/* Total pour vérification */}
                <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-blue-700 font-medium">Total des ventes (Top 5):</span>
                    <span className="text-blue-900 font-bold text-lg">
                      {formatCurrency(topCustomers.reduce((sum: number, c: any) => sum + (c.total_spent || 0), 0))}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs mt-1 text-blue-600">
                    <span>Nombre total d'achats:</span>
                    <span className="font-semibold">
                      {topCustomers.reduce((sum: number, c: any) => sum + (c.purchase_count || 0), 0)} achat(s)
                    </span>
                  </div>
                </div>
                {topCustomers.map((customer: any, index: number) => (
                <div 
                  key={customer.customer_id} 
                  className="flex items-center gap-4 p-4 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-100 hover:border-orange-200 hover:shadow-sm transition-all"
                >
                  <div className={clsx(
                    'w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm',
                    index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' :
                    index === 1 ? 'bg-gradient-to-br from-gray-400 to-gray-600' :
                    index === 2 ? 'bg-gradient-to-br from-amber-500 to-amber-700' : 
                    'bg-gradient-to-br from-gray-300 to-gray-500'
                  )}>
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{customer.name || customer.customer_name || 'Client anonyme'}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-sm text-gray-500">{customer.purchase_count} achat{customer.purchase_count > 1 ? 's' : ''}</p>
                      {customer.phone && (
                        <span className="text-xs text-gray-400">• {customer.phone}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg text-gray-900">
                      {formatCurrency(customer.total_spent)}
                    </p>
                    {index === 0 && (
                      <span className="text-xs text-yellow-600 font-medium">🏆 Meilleur</span>
                    )}
                  </div>
                </div>
                ))}
              </>
            ) : (
              <div className="flex items-center justify-center py-12 text-gray-400">
                <div className="text-center">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Aucune donnée disponible</p>
                  {!showAllCustomers && dateRange.start && dateRange.end && (
                    <p className="text-xs mt-2">
                      Aucune vente entre {new Date(dateRange.start).toLocaleDateString('fr-FR')} et {new Date(dateRange.end).toLocaleDateString('fr-FR')}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

