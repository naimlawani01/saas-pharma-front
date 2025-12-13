import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

export default function AuthLayout() {
  const { isAuthenticated } = useAuthStore();
  
  // Si déjà connecté, rediriger vers le dashboard
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 flex">
      {/* Panneau gauche - Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center p-12 text-white">
        <div className="max-w-md">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m-8-8h16" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold">Pharmacie Manager</h1>
              <p className="text-primary-200 text-sm">Gestion de pharmacie</p>
            </div>
          </div>
          
          <h2 className="text-4xl font-display font-bold mb-4">
            Gérez votre  en toute simplicité
          </h2>
          
          <p className="text-primary-100 text-lg mb-8">
            Une solution complète pour la gestion de stock, les ventes, 
            les clients et les fournisseurs. Fonctionne même sans Internet.
          </p>
          
          <div className="space-y-4">
            <Feature icon="📦" text="Gestion de stock en temps réel" />
            <Feature icon="💰" text="Suivi des ventes et statistiques" />
            <Feature icon="👥" text="Gestion des clients et fournisseurs" />
            <Feature icon="🔄" text="Synchronisation automatique" />
            <Feature icon="📱" text="Fonctionne hors-ligne" />
          </div>
        </div>
      </div>
      
      {/* Panneau droit - Formulaire */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

function Feature({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-2xl">{icon}</span>
      <span className="text-primary-100">{text}</span>
    </div>
  );
}

