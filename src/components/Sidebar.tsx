import { NavLink } from 'react-router-dom';
import { useAppStore } from '@/stores/appStore';
import { useAuthStore } from '@/stores/authStore';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Truck,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  X,
  UserCog,
  ShieldCheck,
  History,
  Edit3,
  DollarSign,
  FileText,
} from 'lucide-react';
import clsx from 'clsx';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
  superAdminOnly?: boolean;
  requiresPharmacy?: boolean;  // Nécessite d'être associé à une pharmacie
}

// Navigation pour les utilisateurs de pharmacie
const pharmacyNavigation: NavItem[] = [
  { name: 'Tableau de bord', href: '/', icon: LayoutDashboard, requiresPharmacy: true },
  { name: 'Caisse', href: '/cash', icon: DollarSign, requiresPharmacy: true },
  { name: 'Gestion Caisses', href: '/cash/registers', icon: Settings, adminOnly: true, requiresPharmacy: true },
  { name: 'Produits', href: '/products', icon: Package, requiresPharmacy: true },
  { name: 'Ventes', href: '/sales', icon: ShoppingCart, requiresPharmacy: true },
  { name: 'Clients', href: '/customers', icon: Users, requiresPharmacy: true },
  { name: 'Prescriptions', href: '/prescriptions', icon: FileText, requiresPharmacy: true },
  { name: 'Fournisseurs', href: '/suppliers', icon: Truck, requiresPharmacy: true },
  { name: 'Mouvements Stock', href: '/stock/movements', icon: History, requiresPharmacy: true },
  { name: 'Ajustements', href: '/stock/adjustments', icon: Edit3, requiresPharmacy: true },
  { name: 'Rapports', href: '/reports', icon: BarChart3, requiresPharmacy: true },
  { name: 'Utilisateurs', href: '/users', icon: UserCog, adminOnly: true, requiresPharmacy: true },
  // Paramètres retiré - accessible via le menu utilisateur en haut à droite
];

// Navigation pour le super admin (gestion globale)
const superAdminNavigation: NavItem[] = [
  { name: 'Super Admin', href: '/admin', icon: ShieldCheck, superAdminOnly: true },
];

export default function Sidebar() {
  const { sidebarOpen, sidebarCollapsed, toggleSidebar, toggleSidebarCollapse } = useAppStore();
  const { user, logout } = useAuthStore();
  
  return (
    <>
      {/* Overlay mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}
      
      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed top-0 left-0 z-50 h-full bg-white border-r border-gray-200 transition-all duration-300',
          sidebarCollapsed ? 'w-20' : 'w-64',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
            <div className={clsx('flex items-center gap-3', sidebarCollapsed && 'justify-center w-full')}>
              <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m-8-8h16" />
                </svg>
              </div>
              {!sidebarCollapsed && (
                <div>
                  <h1 className="font-display font-bold text-gray-900">Pharmacie</h1>
                  <p className="text-xs text-gray-500">Manager</p>
                </div>
              )}
            </div>
            
            {/* Close button mobile */}
            <button
              onClick={toggleSidebar}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
            {/* Super Admin: afficher uniquement le menu admin */}
            {user?.is_superuser && !user?.pharmacy_id && (
              <>
                {superAdminNavigation.map((item) => (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    className={({ isActive }) =>
                      clsx(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                        sidebarCollapsed && 'justify-center',
                        isActive
                          ? 'bg-purple-50 text-purple-700 font-medium'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      )
                    }
                    title={sidebarCollapsed ? item.name : undefined}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    {!sidebarCollapsed && <span>{item.name}</span>}
                  </NavLink>
                ))}
                <div className="my-4 border-t border-gray-200" />
                <p className={clsx(
                  'px-3 text-xs text-gray-400 uppercase tracking-wider',
                  sidebarCollapsed && 'text-center'
                )}>
                  {!sidebarCollapsed && 'Gestion globale'}
                </p>
              </>
            )}
            
            {/* Utilisateurs de pharmacie: menu complet */}
            {pharmacyNavigation
              .filter((item) => {
                // Super admin sans pharmacie ne voit pas les menus pharmacie
                if (user?.is_superuser && !user?.pharmacy_id && item.requiresPharmacy) return false;
                // Admin only items
                if (item.adminOnly && user?.role !== 'admin' && !user?.is_superuser) return false;
                return true;
              })
              .map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                    sidebarCollapsed && 'justify-center',
                    isActive
                      ? 'bg-primary-50 text-primary-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  )
                }
                title={sidebarCollapsed ? item.name : undefined}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!sidebarCollapsed && <span>{item.name}</span>}
              </NavLink>
            ))}
          </nav>
          
          {/* User info (sans bouton déconnexion - maintenant dans le header) */}
          {!sidebarCollapsed && user && (
            <div className="border-t border-gray-200 p-4">
              <div className="flex items-center gap-3 px-2">
                <div className="w-10 h-10 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center font-medium">
                  {user.full_name?.[0] || user.username[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user.full_name || user.username}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{user.role}</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Collapse button */}
          <button
            onClick={toggleSidebarCollapse}
            className="hidden lg:flex items-center justify-center h-12 border-t border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <ChevronLeft className="w-5 h-5" />
            )}
          </button>
        </div>
      </aside>
    </>
  );
}

