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
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 shadow-sm">
        <div className="flex items-center justify-between h-16 px-4 sm:px-6">
          {/* Left side */}
          <div className="flex items-center gap-4">
            <button
              onClick={toggleSidebar}
              className="lg:hidden p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            
            <div>
              <h1 className="text-base sm:text-lg font-semibold text-slate-900 flex items-center gap-2">
                {isSuperAdminGlobal && (
                  <span className="w-6 h-6 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
                    <ShieldCheck className="w-3.5 h-3.5 text-white" />
                  </span>
                )}
                <span className="hidden sm:inline">Bienvenue,</span> {user?.full_name || user?.username}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                {isSuperAdminGlobal ? (
                  <span className="text-purple-600 font-medium">Administration Globale</span>
                ) : (
                  new Date().toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })
                )}
              </p>
            </div>
          </div>
          
          {/* Right side */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Sync status - uniquement pour les utilisateurs de pharmacie */}
            {!isSuperAdminGlobal && (
              <div className="flex items-center gap-2">
                {isOnline ? (
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-medium">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    <Wifi className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">En ligne</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-700 text-xs font-medium">
                    <WifiOff className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Hors ligne</span>
                  </div>
                )}
                
                {pendingSyncCount > 0 && (
                  <button
                    onClick={handleSync}
                    disabled={!isOnline || isSyncing}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-700 text-xs font-medium hover:bg-amber-100 disabled:opacity-50 transition-colors"
                    title="Synchroniser maintenant"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">{pendingSyncCount} à sync</span>
                  </button>
                )}
                
                {isOnline && pendingSyncCount === 0 && (
                  <button
                    onClick={handleSync}
                    disabled={isSyncing}
                    className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-700 disabled:opacity-50 transition-colors"
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
                className="relative p-2 rounded-xl hover:bg-slate-100 transition-colors"
                title={`${alertsCount} alerte(s) non lue(s)`}
              >
                <Bell className={`w-5 h-5 ${alertsCount > 0 ? 'text-slate-900' : 'text-slate-500'}`} />
                {alertsCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1.5 shadow-lg ring-2 ring-white">
                      {alertsCount > 9 ? '9+' : alertsCount}
                    </span>
                )}
              </button>
            )}
            
            {/* User menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-semibold text-sm shadow-sm ${
                  isSuperAdminGlobal 
                    ? 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white' 
                    : 'bg-gradient-to-br from-slate-700 to-slate-800 text-white'
                }`}>
                  {user?.full_name?.[0] || user?.username?.[0]?.toUpperCase() || '?'}
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown menu */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200/50 overflow-hidden z-50">
                  <div className="px-4 py-4 bg-gradient-to-br from-slate-50 to-slate-100 border-b border-slate-200/50">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-semibold text-sm shadow-md ${
                        isSuperAdminGlobal 
                          ? 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white' 
                          : 'bg-gradient-to-br from-slate-700 to-slate-800 text-white'
                      }`}>
                        {user?.full_name?.[0] || user?.username?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                      {user?.full_name || user?.username}
                    </p>
                        <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                      </div>
                    </div>
                    {user?.role && (
                      <span className="inline-flex items-center mt-2 px-2 py-1 rounded-lg bg-white text-xs font-medium text-slate-600 capitalize shadow-sm">
                        {user.role}
                      </span>
                    )}
                  </div>
                  
                  <div className="p-2">
                    <button
                      onClick={() => {
                        navigate('/settings');
                        setShowUserMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                    >
                      <Settings className="w-4 h-4 text-slate-400" />
                      Paramètres
                    </button>
                    <button
                      onClick={() => {
                        logout();
                        setShowUserMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors"
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
