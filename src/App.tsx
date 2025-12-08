import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useAppStore } from '@/stores/appStore';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

// Layouts
import AuthLayout from '@/layouts/AuthLayout';
import DashboardLayout from '@/layouts/DashboardLayout';

// Pages Auth
import LoginPage from '@/pages/auth/LoginPage';

// Pages Dashboard
import DashboardPage from '@/pages/dashboard/DashboardPage';
import ProductsPage from '@/pages/dashboard/ProductsPage';
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
import SuperAdminPage from '@/pages/admin/SuperAdminPage';

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
  
  // Debug log pour vérifier les valeurs
  console.log('SuperAdminRoute check:', { user, isAuthenticated, is_superuser: user?.is_superuser });
  
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
  // Vérifie explicitement que is_superuser est true
  if (user.is_superuser !== true) {
    console.log('Redirecting: user is not superuser');
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

function App() {
  OnlineRefresher();

  return (
    <Routes>
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
        <Route path="/settings" element={<PharmacyRoute><SettingsPage /></PharmacyRoute>} />
        
        {/* Route Super Admin (accessible uniquement aux super admins) */}
        <Route path="/admin" element={<SuperAdminRoute><SuperAdminPage /></SuperAdminRoute>} />
      </Route>
      
      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;

