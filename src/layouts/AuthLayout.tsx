import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Store } from 'lucide-react';
import { appConfig } from '@/config/appConfig';
import { getBusinessConfig } from '@/config/businessConfig';

export default function AuthLayout() {
  const { isAuthenticated } = useAuthStore();
  const businessConfig = getBusinessConfig();
  
  // Si déjà connecté, rediriger vers le dashboard
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-900 flex">
      {/* Panneau gauche - Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center p-12 text-white">
        <div className="max-w-md">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Store className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold">{appConfig.APP_NAME}</h1>
              <p className="text-blue-200 text-sm">{appConfig.APP_TAGLINE}</p>
            </div>
          </div>
          
          <h2 className="text-4xl font-display font-bold mb-4">
            Gérez votre {businessConfig.terminology.business.toLowerCase()} en toute simplicité
          </h2>
          
          <p className="text-blue-100 text-lg mb-8">
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

