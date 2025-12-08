import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/stores/appStore';
import { useAuthStore } from '@/stores/authStore';
import { useSync } from '@/hooks/useSync';
import { Menu, Bell, Wifi, WifiOff, RefreshCw, ShieldCheck, Cloud, LogOut, Settings, ChevronDown } from 'lucide-react';
import AlertsPanel, { useAlertsCount } from './alerts/AlertsPanel';
import toast from 'react-hot-toast';

export default function Header() {
  const navigate = useNavigate();
  const { toggleSidebar, isOnline, pendingSyncCount } = useAppStore();
  const { user, logout } = useAuthStore();
  const { sync } = useSync();
  const alertsCount = useAlertsCount();
  const [showAlerts, setShowAlerts] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  
  // Super admin sans pharmacie ?
  const isSuperAdminGlobal = user?.is_superuser && !user?.pharmacy_id;

  // Fermer le menu utilisateur si on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  const handleSync = async () => {
    if (!isOnline) {
      toast.error('Pas de connexion internet');
      return;
    }
    
    setIsSyncing(true);
    try {
      await sync();
    } finally {
      setIsSyncing(false);
    }
  };
  
  return (
    <>
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between h-16 px-6">
          {/* Left side */}
          <div className="flex items-center gap-4">
            <button
              onClick={toggleSidebar}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
            >
              <Menu className="w-5 h-5" />
            </button>
            
            <div>
              <h1 className="text-lg font-display font-semibold text-gray-900 flex items-center gap-2">
                {isSuperAdminGlobal && (
                  <ShieldCheck className="w-5 h-5 text-purple-600" />
                )}
                Bienvenue, {user?.full_name || user?.username}
              </h1>
              <p className="text-sm text-gray-500">
                {isSuperAdminGlobal ? (
                  <span className="text-purple-600 font-medium">Mode Administration Globale</span>
                ) : (
                  new Date().toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                )}
              </p>
            </div>
          </div>
          
          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Sync status - uniquement pour les utilisateurs de pharmacie */}
            {!isSuperAdminGlobal && (
              <div className="flex items-center gap-2">
                {isOnline ? (
                  <div className="flex items-center gap-1.5 text-green-600 text-sm">
                    <Wifi className="w-4 h-4" />
                    <span className="hidden sm:inline">En ligne</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-orange-600 text-sm">
                    <WifiOff className="w-4 h-4" />
                    <span className="hidden sm:inline">Hors ligne</span>
                  </div>
                )}
                
                {pendingSyncCount > 0 && (
                  <button
                    onClick={handleSync}
                    disabled={!isOnline || isSyncing}
                    className="flex items-center gap-1.5 text-yellow-600 text-sm hover:text-yellow-700 disabled:opacity-50"
                    title="Synchroniser maintenant"
                  >
                    <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">{pendingSyncCount} à sync</span>
                  </button>
                )}
                
                {isOnline && pendingSyncCount === 0 && (
                  <button
                    onClick={handleSync}
                    disabled={isSyncing}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-gray-900 disabled:opacity-50"
                    title="Synchroniser maintenant"
                  >
                    <Cloud className={`w-4 h-4 ${isSyncing ? 'animate-pulse' : ''}`} />
                  </button>
                )}
              </div>
            )}
            
            {/* Notifications - uniquement pour les utilisateurs de pharmacie */}
            {!isSuperAdminGlobal && (
              <button 
                onClick={() => setShowAlerts(true)}
                className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
                title={`${alertsCount} alerte(s) non lue(s)`}
              >
                <Bell className={`w-5 h-5 ${alertsCount > 0 ? 'text-gray-900' : 'text-gray-600'}`} />
                {alertsCount > 0 && (
                  <>
                    {/* Petit point rouge animé en haut à droite de l'icône */}
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse border-2 border-white shadow-sm z-10"></span>
                    {/* Badge avec le nombre d'alertes non lues */}
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1.5 shadow-lg ring-2 ring-white z-10">
                      {alertsCount > 9 ? '9+' : alertsCount}
                    </span>
                  </>
                )}
              </button>
            )}
            
            {/* User menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className={`flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors ${
                  isSuperAdminGlobal 
                    ? 'bg-purple-50' 
                    : 'bg-primary-50'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-medium text-sm ${
                  isSuperAdminGlobal 
                    ? 'bg-purple-100 text-purple-700' 
                    : 'bg-primary-100 text-primary-700'
                }`}>
                  {user?.full_name?.[0] || user?.username?.[0]?.toUpperCase() || '?'}
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown menu */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  <div className="px-4 py-3 border-b border-gray-200">
                    <p className="text-sm font-medium text-gray-900">
                      {user?.full_name || user?.username}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                    {user?.role && (
                      <p className="text-xs text-gray-500 mt-1 capitalize">{user.role}</p>
                    )}
                  </div>
                  
                  <div className="py-1">
                    <button
                      onClick={() => {
                        navigate('/settings');
                        setShowUserMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      Paramètres
                    </button>
                    <button
                      onClick={() => {
                        logout();
                        setShowUserMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Déconnexion
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Alerts Panel - uniquement pour les utilisateurs de pharmacie */}
      {!isSuperAdminGlobal && (
        <AlertsPanel 
          isOpen={showAlerts}
          onClose={() => setShowAlerts(false)}
        />
      )}
    </>
  );
}
