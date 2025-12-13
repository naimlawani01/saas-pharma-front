import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
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
  const { isAuthenticated, accessToken } = useAuthStore();

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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Tableau de bord</h1>
          <p className="text-gray-500">Vue d'ensemble de votre pharmacie</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isFetching}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw className={`w-5 h-5 ${isFetching ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
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
          title="Produits en stock"
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-700 font-medium">Créances totales</p>
                <p className="text-2xl font-bold text-red-900 mt-1">
                  {formatCurrency(creditSummary.total_credit_balance)}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-200 rounded-full flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-red-700" />
              </div>
            </div>
          </div>

          <div className="card bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-700 font-medium">Clients débiteurs</p>
                <p className="text-2xl font-bold text-orange-900 mt-1">
                  {creditSummary.total_customers_with_debt}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-200 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-orange-700" />
              </div>
            </div>
          </div>

          <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700 font-medium">Plafond total</p>
                <p className="text-2xl font-bold text-blue-900 mt-1">
                  {creditSummary.total_credit_limit ? formatCurrency(creditSummary.total_credit_limit) : 'Illimité'}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-200 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-700" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alertes */}
      {(dashboard?.inventory?.low_stock_count > 0 || dashboard?.inventory?.expiring_soon_count > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {dashboard?.inventory?.low_stock_count > 0 && (
            <div className="card bg-yellow-50 border-yellow-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="font-medium text-yellow-800">Stock critique</p>
                  <p className="text-sm text-yellow-600">
                    {dashboard.inventory.low_stock_count} produit(s) à réapprovisionner
                  </p>
                </div>
              </div>
            </div>
          )}
          {dashboard?.inventory?.expiring_soon_count > 0 && (
            <div className="card bg-red-50 border-red-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="font-medium text-red-800">Expiration proche</p>
                  <p className="text-sm text-red-600">
                    {dashboard.inventory.expiring_soon_count} produit(s) bientôt périmé(s)
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
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-gray-900 text-lg">Évolution des ventes</h3>
              <p className="text-sm text-gray-500 mt-1">30 derniers jours</p>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-gray-600">Ventes</span>
              </div>
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
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center">
                  <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Aucune donnée disponible</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Top produits - Amélioré avec gradient */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-gray-900 text-lg">Produits les plus vendus</h3>
              <p className="text-sm text-gray-500 mt-1">Top 5</p>
            </div>
            <Package className="w-5 h-5 text-purple-600" />
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
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center">
                  <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Aucune donnée disponible</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stock critique */}
      {lowStock && lowStock.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Produits en stock critique</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500 border-b">
                  <th className="pb-3 font-medium">Produit</th>
                  <th className="pb-3 font-medium">Stock actuel</th>
                  <th className="pb-3 font-medium">Stock minimum</th>
                  <th className="pb-3 font-medium">Déficit</th>
                </tr>
              </thead>
              <tbody>
                {lowStock.slice(0, 5).map((product: any) => (
                  <tr key={product.id} className="border-b last:border-0">
                    <td className="py-3 font-medium text-gray-900">{product.name}</td>
                    <td className="py-3">
                      <span className="badge-danger">{product.quantity}</span>
                    </td>
                    <td className="py-3 text-gray-600">{product.min_quantity}</td>
                    <td className="py-3 text-red-600 font-medium">-{product.deficit}</td>
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
    <div className="card hover:shadow-lg transition-shadow duration-200 group">
      <div className="flex items-start justify-between">
        <div className={`w-12 h-12 ${iconBg} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200 shadow-sm`}>
          <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-full ${
            trendUp 
              ? 'bg-green-50 text-green-700' 
              : 'bg-red-50 text-red-700'
          }`}>
            {trendUp ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            {trend}%
          </div>
        )}
      </div>
      <div className="mt-5">
        <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
        <p className="text-sm text-gray-600 font-medium">{subValue}</p>
      </div>
      <div className="mt-4 pt-4 border-t border-gray-100">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</p>
      </div>
    </div>
  );
}

