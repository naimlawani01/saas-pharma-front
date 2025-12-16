import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useAppStore } from '@/stores/appStore';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { api } from '@/services/api';

// Layouts
import AuthLayout from '@/layouts/AuthLayout';
import DashboardLayout from '@/layouts/DashboardLayout';

// Pages Auth
import LoginPage from '@/pages/auth/LoginPage';

// Pages Setup
import SetupPage from '@/pages/setup/SetupPage';

// Pages Dashboard
import DashboardPage from '@/pages/dashboard/DashboardPage';
import ProductsPage from '@/pages/dashboard/ProductsPage';
import CategoriesPage from '@/pages/dashboard/CategoriesPage';
import SalesPage from '@/pages/dashboard/SalesPage';
import NewSalePage from '@/pages/dashboard/NewSalePage';
import CustomersPage from '@/pages/dashboard/CustomersPage';
import SuppliersPage from '@/pages/dashboard/SuppliersPage';
import SupplierOrdersPage from '@/pages/dashboard/SupplierOrdersPage';
import ReportsPage from '@/pages/dashboard/ReportsPage';
import SettingsPage from '@/pages/dashboard/SettingsPage';
import UsersPage from '@/pages/dashboard/UsersPage';
import StockMovementsPage from '@/pages/dashboard/StockMovementsPage';
import StockAdjustmentsPage from '@/pages/dashboard/StockAdjustmentsPage';
import CashRegisterPage from '@/pages/dashboard/CashRegisterPage';
import CashHistoryPage from '@/pages/dashboard/CashHistoryPage';
import CashRegistersManagementPage from '@/pages/dashboard/CashRegistersManagementPage';
import PrescriptionsPage from '@/pages/dashboard/PrescriptionsPage';
import CustomerDebtsPage from '@/pages/dashboard/CustomerDebtsPage';
import SyncSettingsPage from '@/pages/dashboard/SyncSettingsPage';
import SuperAdminPage from '@/pages/admin/SuperAdminPage';

// Composant pour vérifier si le setup initial est nécessaire
function SetupChecker({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkSetup = async () => {
      // Ne pas vérifier si on est déjà sur la page setup
      if (location.pathname === '/setup') {
        setIsChecking(false);
        return;
      }

      try {
        const response = await api.get('/setup/status');
        if (response.data.needs_setup) {
          navigate('/setup', { replace: true });
        }
      } catch (error) {
        // Si erreur (backend pas encore prêt), on attend
        console.log('[Setup] Erreur de vérification, backend peut-être pas prêt');
      } finally {
        setIsChecking(false);
      }
    };

    checkSetup();
  }, [navigate, location.pathname]);

  // Afficher un loader pendant la vérification
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Vérification de la configuration...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// Protected Route
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

// Route qui nécessite une pharmacie associée
function PharmacyRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  
  // Super admin sans pharmacie -> rediriger vers /admin
  if (user?.is_superuser && !user?.pharmacy_id) {
    return <Navigate to="/admin" replace />;
  }
  
  // Utilisateur sans pharmacie -> erreur
  if (!user?.pharmacy_id) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <p className="text-lg font-medium">Accès non autorisé</p>
        <p className="text-sm">Vous n'êtes pas associé à une pharmacie.</p>
      </div>
    );
  }
  
  return <>{children}</>;
}

// Route réservée aux Super Admins
function SuperAdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuthStore();
  
  // Attendre que l'utilisateur soit chargé
  if (isAuthenticated && !user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }
  
  // Non authentifié
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }
  
  // Non super admin -> rediriger vers le dashboard
  if (user.is_superuser !== true) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
}

function OnlineRefresher() {
  const queryClient = useQueryClient();
  const { isOnline } = useAppStore();

  useEffect(() => {
    if (isOnline) {
      queryClient.invalidateQueries();
    }
  }, [isOnline, queryClient]);

  return null;
}

function OnlineStatusListener() {
  const setOnlineStatus = useAppStore((state) => state.setOnlineStatus);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => setOnlineStatus(true);
    const handleOffline = () => setOnlineStatus(false);

    setOnlineStatus(navigator.onLine);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOnlineStatus]);

  return null;
}

function App() {
  return (
    <SetupChecker>
      <OnlineStatusListener />
      <OnlineRefresher />
      <Routes>
        {/* Setup Route - Premier lancement */}
        <Route path="/setup" element={<SetupPage />} />
        
        {/* Auth Routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>
        
        {/* Dashboard Routes */}
        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          {/* Routes nécessitant une pharmacie */}
          <Route path="/" element={<PharmacyRoute><DashboardPage /></PharmacyRoute>} />
          <Route path="/products" element={<PharmacyRoute><ProductsPage /></PharmacyRoute>} />
          <Route path="/products/categories" element={<PharmacyRoute><CategoriesPage /></PharmacyRoute>} />
          <Route path="/sales" element={<PharmacyRoute><SalesPage /></PharmacyRoute>} />
          <Route path="/sales/new" element={<PharmacyRoute><NewSalePage /></PharmacyRoute>} />
          <Route path="/customers" element={<PharmacyRoute><CustomersPage /></PharmacyRoute>} />
          <Route path="/suppliers" element={<PharmacyRoute><SuppliersPage /></PharmacyRoute>} />
          <Route path="/suppliers/orders" element={<PharmacyRoute><SupplierOrdersPage /></PharmacyRoute>} />
          <Route path="/reports" element={<PharmacyRoute><ReportsPage /></PharmacyRoute>} />
          <Route path="/stock/movements" element={<PharmacyRoute><StockMovementsPage /></PharmacyRoute>} />
          <Route path="/stock/adjustments" element={<PharmacyRoute><StockAdjustmentsPage /></PharmacyRoute>} />
          <Route path="/cash" element={<PharmacyRoute><CashRegisterPage /></PharmacyRoute>} />
          <Route path="/cash/history" element={<PharmacyRoute><CashHistoryPage /></PharmacyRoute>} />
          <Route path="/cash/registers" element={<PharmacyRoute><CashRegistersManagementPage /></PharmacyRoute>} />
          <Route path="/users" element={<PharmacyRoute><UsersPage /></PharmacyRoute>} />
          <Route path="/prescriptions" element={<PharmacyRoute><PrescriptionsPage /></PharmacyRoute>} />
          <Route path="/customers/debts" element={<PharmacyRoute><CustomerDebtsPage /></PharmacyRoute>} />
          <Route path="/settings" element={<PharmacyRoute><SettingsPage /></PharmacyRoute>} />
          <Route path="/settings/sync" element={<PharmacyRoute><SyncSettingsPage /></PharmacyRoute>} />
          
          {/* Route Super Admin */}
          <Route path="/admin" element={<SuperAdminRoute><SuperAdminPage /></SuperAdminRoute>} />
        </Route>
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </SetupChecker>
  );
}

export default App;
