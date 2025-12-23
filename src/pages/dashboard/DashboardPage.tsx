import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { businessTypes, BusinessType } from '@/config/businessConfig';
import { 
  TrendingUp, 
  Package, 
  AlertTriangle, 
  Users,
  ShoppingCart,
  DollarSign,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Area,
  AreaChart,
} from 'recharts';

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const { isAuthenticated, accessToken, user } = useAuthStore();
  // Note: businessConfig est gardé pour compatibilité, mais on utilise businessTypeConfig pour les données réelles

  // Récupérer les infos du commerce
  const { data: pharmacyInfo } = useQuery({
    queryKey: ['my-pharmacy'],
    queryFn: async () => {
      const response = await api.get('/pharmacies/');
      return response.data?.[0] || null;
    },
    enabled: isAuthenticated && !!accessToken && !user?.is_superuser,
    retry: 1,
    staleTime: 5 * 60 * 1000, // Cache 5 minutes
  });

  // Obtenir la config du business type depuis la BDD
  const currentBusinessType = pharmacyInfo?.business_type as BusinessType || 'general';
  const businessTypeConfig = businessTypes[currentBusinessType] || businessTypes.general;

  // Récupérer les stats du dashboard
  const { data: dashboard, isLoading, isFetching } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const response = await api.get('/reports/dashboard');
      return response.data;
    },
    enabled: isAuthenticated && !!accessToken,
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 401) return false;
      return failureCount < 2;
    },
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['sales-by-period'] });
    queryClient.invalidateQueries({ queryKey: ['low-stock'] });
    queryClient.invalidateQueries({ queryKey: ['top-products'] });
    queryClient.invalidateQueries({ queryKey: ['credits-summary'] });
    toast.success('Tableau de bord actualisé');
  };

  // Récupérer les ventes par période
  const { data: salesData } = useQuery({
    queryKey: ['sales-by-period'],
    queryFn: async () => {
      const response = await api.get('/reports/sales-by-period?group_by=day');
      return response.data;
    },
    enabled: isAuthenticated && !!accessToken,
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 401) return false;
      return failureCount < 2;
    },
  });

  // Produits en stock critique
  const { data: lowStock } = useQuery({
    queryKey: ['low-stock'],
    queryFn: async () => {
      const response = await api.get('/reports/low-stock');
      return response.data;
    },
    enabled: isAuthenticated && !!accessToken,
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 401) return false;
      return failureCount < 2;
    },
  });

  // Top produits
  const { data: topProducts } = useQuery({
    queryKey: ['top-products'],
    queryFn: async () => {
      const response = await api.get('/reports/top-products?limit=5');
      return response.data;
    },
    enabled: isAuthenticated && !!accessToken,
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 401) return false;
      return failureCount < 2;
    },
  });

  // Résumé des crédits
  const { data: creditSummary } = useQuery({
    queryKey: ['credits-summary'],
    queryFn: async () => {
      const response = await api.get('/credits/summary');
      return response.data;
    },
    enabled: isAuthenticated && !!accessToken,
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 401) return false;
      return failureCount < 2;
    },
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-GN', {
      style: 'decimal',
      minimumFractionDigits: 0,
    }).format(value) + ' GNF';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-purple-600 border-t-transparent"></div>
          <p className="text-sm text-slate-500">Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête personnalisé selon le commerce */}
      <div className={`relative overflow-hidden rounded-3xl p-6 sm:p-8 text-white shadow-2xl bg-gradient-to-br ${
        currentBusinessType === 'pharmacy' ? 'from-emerald-600 via-emerald-700 to-teal-800' :
        currentBusinessType === 'grocery' ? 'from-orange-500 via-orange-600 to-amber-700' :
        currentBusinessType === 'hardware' ? 'from-slate-700 via-slate-800 to-slate-900' :
        currentBusinessType === 'cosmetics' ? 'from-pink-500 via-pink-600 to-rose-700' :
        currentBusinessType === 'auto_parts' ? 'from-blue-600 via-blue-700 to-indigo-800' :
        currentBusinessType === 'clothing' ? 'from-violet-600 via-violet-700 to-purple-800' :
        currentBusinessType === 'electronics' ? 'from-cyan-600 via-cyan-700 to-blue-800' :
        currentBusinessType === 'restaurant' ? 'from-amber-500 via-amber-600 to-orange-700' :
        currentBusinessType === 'wholesale' ? 'from-indigo-600 via-indigo-700 to-purple-800' :
        'from-slate-800 via-slate-900 to-slate-950'
      }`}>
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>
        
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center text-4xl shadow-lg ring-4 ring-white/10">
              {businessTypeConfig.icon}
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">
                {pharmacyInfo?.name || 'Tableau de bord'}
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="inline-flex items-center px-3 py-1 bg-white/20 backdrop-blur-sm rounded-lg text-sm font-medium">
                  {businessTypeConfig.name}
                </span>
                {pharmacyInfo?.city && (
                  <span className="text-white/70 text-sm flex items-center gap-1">
                    <span className="w-1 h-1 bg-white/50 rounded-full" />
                    {pharmacyInfo.city}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isFetching}
            className="group inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm px-5 py-3 rounded-xl font-medium transition-all duration-300 border border-white/10 shadow-lg self-start lg:self-center"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
            Actualiser
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Ventes du jour"
          value={formatCurrency(dashboard?.daily_sales?.amount || 0)}
          subValue={`${dashboard?.daily_sales?.count || 0} ventes`}
          icon={ShoppingCart}
          iconBg="bg-green-100"
          iconColor="text-green-600"
        />
        <StatCard
          title="Ventes du mois"
          value={formatCurrency(dashboard?.monthly_sales?.amount || 0)}
          subValue={`${dashboard?.monthly_sales?.count || 0} ventes`}
          icon={DollarSign}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
        />
        <StatCard
          title={`${businessTypeConfig.terminology.productPlural} en stock`}
          value={dashboard?.inventory?.total_products || 0}
          subValue={`Valeur: ${formatCurrency(dashboard?.inventory?.stock_value || 0)}`}
          icon={Package}
          iconBg="bg-purple-100"
          iconColor="text-purple-600"
        />
        <StatCard
          title="Clients"
          value={dashboard?.customers?.total || 0}
          subValue="Clients actifs"
          icon={Users}
          iconBg="bg-orange-100"
          iconColor="text-orange-600"
        />
      </div>

      {/* Widgets Créances */}
      {creditSummary && creditSummary.total_credit_balance > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="group relative bg-white rounded-2xl p-5 shadow-lg shadow-red-100/50 border border-red-100 hover:shadow-xl transition-all duration-300">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-red-50 to-transparent rounded-bl-full" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-red-600 uppercase tracking-wide">Créances totales</p>
                <p className="text-2xl font-bold text-slate-900 mt-2">
                  {formatCurrency(creditSummary.total_credit_balance)}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-200">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="group relative bg-white rounded-2xl p-5 shadow-lg shadow-amber-100/50 border border-amber-100 hover:shadow-xl transition-all duration-300">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-amber-50 to-transparent rounded-bl-full" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Clients débiteurs</p>
                <p className="text-2xl font-bold text-slate-900 mt-2">
                  {creditSummary.total_customers_with_debt}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-200">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="group relative bg-white rounded-2xl p-5 shadow-lg shadow-blue-100/50 border border-blue-100 hover:shadow-xl transition-all duration-300">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-50 to-transparent rounded-bl-full" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Plafond total</p>
                <p className="text-2xl font-bold text-slate-900 mt-2">
                  {creditSummary.total_credit_limit ? formatCurrency(creditSummary.total_credit_limit) : 'Illimité'}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alertes */}
      {(dashboard?.inventory?.low_stock_count > 0 || (businessTypeConfig.features.expiryDates && dashboard?.inventory?.expiring_soon_count > 0)) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {dashboard?.inventory?.low_stock_count > 0 && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-5 border border-amber-200/50 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-200">
                  <AlertTriangle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Stock critique</p>
                  <p className="text-sm text-slate-600">
                    {dashboard.inventory.low_stock_count} {businessTypeConfig.terminology.product.toLowerCase()}(s) à réapprovisionner
                  </p>
                </div>
              </div>
            </div>
          )}
          {businessTypeConfig.features.expiryDates && dashboard?.inventory?.expiring_soon_count > 0 && (
            <div className="bg-gradient-to-r from-red-50 to-rose-50 rounded-2xl p-5 border border-red-200/50 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-red-400 to-red-500 rounded-xl flex items-center justify-center shadow-lg shadow-red-200">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Expiration proche</p>
                  <p className="text-sm text-slate-600">
                    {dashboard.inventory.expiring_soon_count} {businessTypeConfig.terminology.product.toLowerCase()}(s) bientôt périmé(s)
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ventes par jour - Amélioré avec Area Chart */}
        <div className="bg-white rounded-2xl p-6 shadow-lg shadow-slate-200/50 border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-slate-900 text-lg">Évolution des ventes</h3>
              <p className="text-sm text-slate-500 mt-1">30 derniers jours</p>
            </div>
            <div className="flex items-center gap-2 text-sm px-3 py-1.5 bg-emerald-50 rounded-lg">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-emerald-700 font-medium">Ventes</span>
            </div>
          </div>
          <div className="h-80">
            {salesData && salesData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis 
                    dataKey="period" 
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
                    }}
                  />
                  <YAxis 
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => {
                      if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                      if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                      return value.toString();
                    }}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      padding: '12px',
                    }}
                    formatter={(value: number) => [formatCurrency(value), 'Montant']}
                    labelFormatter={(label) => {
                      const date = new Date(label);
                      return date.toLocaleDateString('fr-FR', { 
                        weekday: 'short', 
                        day: '2-digit', 
                        month: 'short' 
                      });
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="total" 
                    stroke="#22c55e" 
                    strokeWidth={3}
                    fill="url(#colorSales)"
                    dot={{ fill: '#22c55e', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#22c55e', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400">
                <div className="text-center">
                  <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-slate-500">Aucune donnée disponible</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Top produits - Amélioré avec gradient */}
        <div className="bg-white rounded-2xl p-6 shadow-lg shadow-slate-200/50 border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-slate-900 text-lg">{businessTypeConfig.terminology.productPlural} les plus vendu(e)s</h3>
              <p className="text-sm text-slate-500 mt-1">Top 5</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-200">
              <Package className="w-5 h-5 text-white" />
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
                    <linearGradient id="colorBar" x1="0" y1="0" x2="1" y2="0">
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
                    width={120}
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
                    formatter={(value: number) => [`${value} unités`, 'Quantité vendue']}
                  />
                  <Bar 
                    dataKey="total_quantity" 
                    fill="url(#colorBar)" 
                    radius={[0, 8, 8, 0]}
                    animationDuration={800}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400">
                <div className="text-center">
                  <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-slate-500">Aucune donnée disponible</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stock critique */}
      {lowStock && lowStock.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-900">{businessTypeConfig.terminology.productPlural} en stock critique</h3>
              <p className="text-sm text-slate-500 mt-0.5">À réapprovisionner rapidement</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-200">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{businessTypeConfig.terminology.product}</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Stock actuel</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Stock minimum</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Déficit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {lowStock.slice(0, 5).map((product: any) => (
                  <tr key={product.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">{product.name}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-50 text-red-700">
                        {product.quantity}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{product.min_quantity}</td>
                    <td className="px-6 py-4">
                      <span className="text-red-600 font-semibold">-{product.deficit}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  subValue: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  trend?: number;
  trendUp?: boolean;
}

function StatCard({ title, value, subValue, icon: Icon, iconBg, iconColor, trend, trendUp }: StatCardProps) {
  return (
    <div className="group relative bg-white rounded-2xl p-6 shadow-lg shadow-slate-200/50 border border-slate-100 hover:shadow-xl hover:shadow-slate-200/60 transition-all duration-300 hover:-translate-y-1">
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-slate-50 to-transparent rounded-bl-full opacity-50" />
      <div className="relative flex items-start justify-between">
        <div className={`w-12 h-12 ${iconBg} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
          <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg ${
            trendUp 
              ? 'bg-emerald-50 text-emerald-700' 
              : 'bg-red-50 text-red-700'
          }`}>
            {trendUp ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            {trend}%
          </div>
        )}
      </div>
      <div className="relative mt-5">
        <p className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-1">{title}</p>
        <p className="text-3xl font-bold text-slate-900">{value}</p>
        <p className="text-sm text-slate-500 mt-1">{subValue}</p>
      </div>
    </div>
  );
}

