import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading } = useAuthStore();
  
  const [formData, setFormData] = useState({
    identifier: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.identifier || !formData.password) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }
    
    try {
      // Déterminer si c'est un email ou username
      const isEmail = formData.identifier.includes('@');
      await login({
        ...(isEmail ? { email: formData.identifier } : { username: formData.identifier }),
        password: formData.password,
      });
      
      toast.success('Connexion réussie !');
      navigate('/');
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Erreur de connexion';
      toast.error(message);
    }
  };
  
  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 animate-fadeIn">
      {/* Logo mobile */}
      <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
        <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center">
          <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m-8-8h16" />
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-display font-bold text-gray-900">Pharmacie Manager</h1>
        </div>
      </div>
      
      <div className="text-center mb-8">
        <h2 className="text-2xl font-display font-bold text-gray-900">Connexion</h2>
        <p className="text-gray-500 mt-2">Accédez à votre espace de gestion</p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="label">Email ou nom d'utilisateur</label>
          <input
            type="text"
            value={formData.identifier}
            onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
            className="input"
            placeholder="admin@exemple.com ou admin"
            autoComplete="username"
            disabled={isLoading}
          />
        </div>
        
        <div>
          <label className="label">Mot de passe</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="input pr-11"
              placeholder="••••••••"
              autoComplete="current-password"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-600">Se souvenir de moi</span>
          </label>
          
          <a href="#" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
            Mot de passe oublié ?
          </a>
        </div>
        
        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary w-full py-3 text-base"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Connexion...
            </span>
          ) : (
            'Se connecter'
          )}
        </button>
      </form>
      
      {/* Demo credentials */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-500 text-center mb-2">Comptes de démonstration :</p>
        <div className="text-center text-sm space-y-1">
          <p className="text-purple-700"><strong>Super Admin :</strong> superadmin / superadmin123</p>
          <p className="text-gray-700"><strong>Admin Pharmacie :</strong> admin / admin123</p>
          <p className="text-gray-700"><strong>Pharmacien :</strong> pharmacien / pharma123</p>
        </div>
      </div>
    </div>
  );
}

