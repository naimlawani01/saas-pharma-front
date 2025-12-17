import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { useAppStore } from '@/stores/appStore';
import { getBusinessConfig, isFeatureEnabled } from '@/config/businessConfig';
import { 
  User,
  Building,
  Bell,
  Shield,
  Palette,
  Database,
  RefreshCw,
  Save,
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

// Les onglets sont générés dynamiquement selon le type d'activité
const getSettingsTabs = () => {
  const businessConfig = getBusinessConfig();
  return [
  { id: 'profile', name: 'Profil', icon: User },
    { id: 'pharmacy', name: businessConfig.terminology.business, icon: Building },
  { id: 'notifications', name: 'Notifications', icon: Bell },
  { id: 'security', name: 'Sécurité', icon: Shield },
  { id: 'appearance', name: 'Apparence', icon: Palette },
  { id: 'sync', name: 'Synchronisation', icon: Database },
];
};

interface Business {
  id: number;
  name: string;
  address: string | null;
  city: string | null;
  country: string;
  phone: string | null;
  email: string | null;
  license_number: string | null;
  business_type: string;
  is_active: boolean;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const { user } = useAuthStore();
  const { theme, setTheme, isOnline, pendingSyncCount } = useAppStore();
  const businessConfig = getBusinessConfig();
  const tabs = getSettingsTabs();
  const showExpiryNotifications = isFeatureEnabled('expiryDates');

  // Récupérer les informations du commerce
  const { data: business, isLoading: loadingBusiness } = useQuery({
    queryKey: ['pharmacy', user?.pharmacy_id],
    queryFn: async () => {
      if (!user?.pharmacy_id) return null;
      const response = await api.get(`/pharmacies/${user.pharmacy_id}`);
      return response.data as Business;
    },
    enabled: !!user?.pharmacy_id && !user?.is_superuser,
  });

  return (
    <div className="animate-fadeIn">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-gray-900">Paramètres</h1>
        <p className="text-gray-500">Gérez vos préférences et configurations</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Tabs sidebar */}
        <div className="lg:w-64 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left',
                activeTab === tab.id
                  ? 'bg-primary-50 text-primary-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              <tab.icon className="w-5 h-5" />
              {tab.name}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeTab === 'profile' && (
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Informations personnelles</h2>
              
              <div className="flex items-center gap-4 mb-6">
                <div className="w-20 h-20 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-2xl font-bold">
                  {user?.full_name?.[0] || user?.username[0].toUpperCase()}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{user?.full_name || user?.username}</h3>
                  <p className="text-gray-500">{user?.email}</p>
                  <span className="badge badge-info mt-1">{user?.role}</span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Nom complet</label>
                  <input
                    type="text"
                    defaultValue={user?.full_name || ''}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Nom d'utilisateur</label>
                  <input
                    type="text"
                    defaultValue={user?.username}
                    className="input"
                    disabled
                  />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input
                    type="email"
                    defaultValue={user?.email}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Téléphone</label>
                  <input
                    type="tel"
                    className="input"
                    placeholder="+224 6XX XX XX XX"
                  />
                </div>
              </div>
              
              <div className="mt-6 flex justify-end">
                <button 
                  className="btn-primary flex items-center gap-2"
                  onClick={() => toast.success('Profil mis à jour')}
                >
                  <Save className="w-5 h-5" />
                  Enregistrer
                </button>
              </div>
            </div>
          )}

          {activeTab === 'pharmacy' && (
            <BusinessSettingsTab 
              business={business} 
              isLoading={loadingBusiness}
              businessId={user?.pharmacy_id}
            />
          )}

          {activeTab === 'appearance' && (
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Apparence</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="label">Thème</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setTheme('light')}
                      className={clsx(
                        'p-4 rounded-lg border-2 text-left transition-colors',
                        theme === 'light' ? 'border-primary-500 bg-primary-50' : 'border-gray-200'
                      )}
                    >
                      <div className="w-full h-20 bg-white rounded-lg border mb-2" />
                      <p className="font-medium">Clair</p>
                    </button>
                    <button
                      onClick={() => setTheme('dark')}
                      className={clsx(
                        'p-4 rounded-lg border-2 text-left transition-colors',
                        theme === 'dark' ? 'border-primary-500 bg-primary-50' : 'border-gray-200'
                      )}
                    >
                      <div className="w-full h-20 bg-gray-800 rounded-lg mb-2" />
                      <p className="font-medium">Sombre</p>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sync' && (
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Synchronisation</h2>
              
              <div className="space-y-6">
                {/* Status */}
                <div className="p-4 rounded-lg bg-gray-50">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={clsx(
                        'w-3 h-3 rounded-full',
                        isOnline ? 'bg-green-500' : 'bg-orange-500'
                      )} />
                      <span className="font-medium">
                        {isOnline ? 'En ligne' : 'Hors ligne'}
                      </span>
                    </div>
                    <button className="btn-secondary flex items-center gap-2">
                      <RefreshCw className="w-4 h-4" />
                      Synchroniser
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Dernière sync</p>
                      <p className="font-medium">
                        {new Date().toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">En attente</p>
                      <p className="font-medium">{pendingSyncCount} opération(s)</p>
                    </div>
                  </div>
                </div>
                
                {/* Options */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">Sync automatique</p>
                      <p className="text-sm text-gray-500">Synchroniser automatiquement quand en ligne</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">Sync sur WiFi uniquement</p>
                      <p className="text-sm text-gray-500">Ne pas utiliser les données mobiles</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Sécurité</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-4">Changer le mot de passe</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="label">Mot de passe actuel</label>
                      <input type="password" className="input" />
                    </div>
                    <div>
                      <label className="label">Nouveau mot de passe</label>
                      <input type="password" className="input" />
                    </div>
                    <div>
                      <label className="label">Confirmer le nouveau mot de passe</label>
                      <input type="password" className="input" />
                    </div>
                    <button 
                      className="btn-primary"
                      onClick={() => toast.success('Mot de passe modifié')}
                    >
                      Mettre à jour
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Notifications</h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">Alertes de stock</p>
                    <p className="text-sm text-gray-500">Notifier quand un {businessConfig.terminology.product.toLowerCase()} est en stock critique</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>
                
                {showExpiryNotifications && (
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                      <p className="font-medium text-gray-900">Expiration des {businessConfig.terminology.productPlural.toLowerCase()}</p>
                      <p className="text-sm text-gray-500">Notifier avant expiration des {businessConfig.terminology.productPlural.toLowerCase()}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>
                )}
                
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">Résumé quotidien</p>
                    <p className="text-sm text-gray-500">Recevoir un résumé des ventes chaque jour</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Composant pour l'onglet Commerce/Pharmacie
function BusinessSettingsTab({ 
  business, 
  isLoading, 
  businessId 
}: { 
  business: Business | null | undefined; 
  isLoading: boolean;
  businessId?: number | null;
}) {
  const queryClient = useQueryClient();
  const businessConfig = getBusinessConfig();
  
  const [formData, setFormData] = useState({
    name: '',
    license_number: '',
    phone: '',
    address: '',
    email: '',
    city: '',
    country: 'Guinée',
  });

  // Mettre à jour le formulaire quand les données du commerce sont chargées
  useEffect(() => {
    if (business) {
      setFormData({
        name: business.name || '',
        license_number: business.license_number || '',
        phone: business.phone || '',
        address: business.address || '',
        email: business.email || '',
        city: business.city || '',
        country: business.country || 'Guinée',
      });
    }
  }, [business]);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!businessId) throw new Error(`Aucun(e) ${businessConfig.terminology.business.toLowerCase()} associé(e)`);
      const response = await api.put(`/pharmacies/${businessId}`, data);
      return response.data;
    },
    onSuccess: () => {
      toast.success(`Informations ${businessConfig.terminology.business.toLowerCase()} mises à jour`);
      queryClient.invalidateQueries({ queryKey: ['pharmacy', businessId] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Erreur lors de la mise à jour');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId) {
      toast.error(`Aucun(e) ${businessConfig.terminology.business.toLowerCase()} associé(e)`);
      return;
    }
    updateMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="card">
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  if (!business && !isLoading) {
    return (
      <div className="card">
        <div className="text-center p-12">
          <Building className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Aucun(e) {businessConfig.terminology.business.toLowerCase()} associé(e)
          </h3>
          <p className="text-gray-500">
            Votre compte n'est pas associé à un(e) {businessConfig.terminology.business.toLowerCase()}.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Informations de {businessConfig.terminology.business.toLowerCase()}</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="label">Nom de {businessConfig.terminology.business.toLowerCase()} *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input"
              required
            />
          </div>
          <div>
            <label className="label">Numéro de registre / licence</label>
            <input
              type="text"
              value={formData.license_number}
              onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="label">Téléphone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="input"
              placeholder="+224 6XX XX XX XX"
            />
          </div>
          <div>
            <label className="label">Ville</label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              className="input"
              placeholder="Conakry"
            />
          </div>
          <div>
            <label className="label">Pays</label>
            <input
              type="text"
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              className="input"
            />
          </div>
          <div className="md:col-span-2">
            <label className="label">Adresse</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="input"
              placeholder="Rue, quartier..."
            />
          </div>
          <div className="md:col-span-2">
            <label className="label">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="input"
              placeholder="contact@entreprise.gn"
            />
          </div>
        </div>
        
        <div className="mt-6 flex justify-end">
          <button 
            type="submit"
            disabled={updateMutation.isPending}
            className="btn-primary flex items-center gap-2"
          >
            <Save className="w-5 h-5" />
            {updateMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </div>
  );
}

