import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
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
            <div className="w-14 h-14 rounded-xl flex items-center justify-center backdrop-blur-sm overflow-hidden">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="w-full h-full">
                <defs>
                  <linearGradient id="authLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{stopColor:"#6366F1",stopOpacity:1}} />
                    <stop offset="100%" style={{stopColor:"#8B5CF6",stopOpacity:1}} />
                  </linearGradient>
                </defs>
                <rect width="100" height="100" rx="22" fill="url(#authLogoGrad)"/>
                <path 
                  d="M 30 25 L 30 75 L 70 75 L 70 60 L 50 60 L 50 50 L 65 50 L 65 35 L 50 35 L 50 25 Z" 
                  fill="white" 
                  stroke="white" 
                  strokeWidth="2" 
                  strokeLinejoin="round" 
                  strokeLinecap="round"
                />
              </svg>
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

