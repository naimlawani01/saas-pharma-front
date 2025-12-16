import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, User, Lock, Mail, Phone, MapPin, FileText, ArrowRight, CheckCircle, Loader2, Cloud, AlertTriangle, WifiOff, RefreshCw } from 'lucide-react';
import { api } from '@/services/api';
import { appConfig } from '@/config/appConfig';
import axios from 'axios';
import toast from 'react-hot-toast';

interface PharmacyData {
  name: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  license_number: string;
}

interface AdminData {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
  full_name: string;
}

export default function SetupPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [isCloudAvailable, setIsCloudAvailable] = useState<boolean | null>(null);
  const [isCheckingCloud, setIsCheckingCloud] = useState(true);
  
  const [pharmacyData, setPharmacyData] = useState<PharmacyData>({
    name: '',
    address: '',
    city: '',
    phone: '',
    email: '',
    license_number: '',
  });
  
  const [adminData, setAdminData] = useState<AdminData>({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    full_name: '',
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Vérifier la connexion au cloud au démarrage
  useEffect(() => {
    checkCloudConnection();
  }, []);

  const checkCloudConnection = async () => {
    setIsCheckingCloud(true);
    try {
      const cloudApi = axios.create({
        baseURL: appConfig.CLOUD_SERVER_URL,
        timeout: 10000,
      });
      
      await cloudApi.get('/health');
      setIsCloudAvailable(true);
      console.log('[Setup] Cloud disponible:', appConfig.CLOUD_SERVER_URL);
    } catch (error) {
      setIsCloudAvailable(false);
      console.error('[Setup] Cloud non disponible:', error);
    } finally {
      setIsCheckingCloud(false);
    }
  };

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};
    
    if (!pharmacyData.name.trim()) {
      newErrors.pharmacyName = 'Le nom de la pharmacie est requis';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors: Record<string, string> = {};
    
    if (!adminData.full_name.trim()) {
      newErrors.fullName = 'Le nom complet est requis';
    }
    
    if (!adminData.email.trim()) {
      newErrors.email = "L'email est requis";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminData.email)) {
      newErrors.email = "L'email n'est pas valide";
    }
    
    if (!adminData.username.trim()) {
      newErrors.username = "Le nom d'utilisateur est requis";
    } else if (adminData.username.length < 3) {
      newErrors.username = "Le nom d'utilisateur doit faire au moins 3 caractères";
    }
    
    if (!adminData.password) {
      newErrors.password = 'Le mot de passe est requis';
    } else if (adminData.password.length < 6) {
      newErrors.password = 'Le mot de passe doit faire au moins 6 caractères';
    }
    
    if (adminData.password !== adminData.confirmPassword) {
      newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep2()) return;
    
    // Vérifier que le cloud est disponible
    if (!isCloudAvailable) {
      toast.error('Connexion au serveur requise. Vérifiez votre connexion internet.');
      return;
    }
    
    setIsLoading(true);
    setCloudError(null);
    
    try {
      // =====================================================
      // ÉTAPE 1: Créer le compte sur le CLOUD (OBLIGATOIRE)
      // =====================================================
      console.log('[Setup] Création du compte sur le cloud...');
      
      const cloudApi = axios.create({
        baseURL: appConfig.CLOUD_SERVER_URL + '/api/v1',
        timeout: 30000,
      });
      
      const cloudResponse = await cloudApi.post('/setup/register', {
        pharmacy_name: pharmacyData.name,
        pharmacy_address: pharmacyData.address || null,
        pharmacy_city: pharmacyData.city || null,
        pharmacy_phone: pharmacyData.phone || null,
        pharmacy_email: pharmacyData.email || null,
        pharmacy_license: pharmacyData.license_number || null,
        admin_email: adminData.email,
        admin_username: adminData.username,
        admin_password: adminData.password,
        admin_full_name: adminData.full_name,
      });
      
      console.log('[Setup] Compte cloud créé:', cloudResponse.data);
      toast.success('Compte créé sur le serveur !');
      
      // =====================================================
      // ÉTAPE 2: Créer le compte en LOCAL (pour l'offline)
      // =====================================================
      console.log('[Setup] Création du compte local...');
      
      const localResponse = await api.post('/setup/initialize', {
        pharmacy: {
          name: pharmacyData.name,
          address: pharmacyData.address || null,
          city: pharmacyData.city || null,
          phone: pharmacyData.phone || null,
          email: pharmacyData.email || null,
          license_number: pharmacyData.license_number || null,
        },
        admin: {
          email: adminData.email,
          username: adminData.username,
          password: adminData.password,
          full_name: adminData.full_name,
        },
      });
      
      if (localResponse.data.success) {
        console.log('[Setup] Compte local créé');
        toast.success('Configuration terminée !');
        setStep(3);
        
        // Rediriger vers login après 2 secondes
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Erreur lors de la configuration';
      console.error('[Setup] Erreur:', message);
      setCloudError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  // Écran de chargement pendant la vérification du cloud
  if (isCheckingCloud) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-teal-800 to-cyan-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm mb-4">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Connexion au serveur...</h2>
          <p className="text-emerald-200">Vérification de la connexion</p>
        </div>
      </div>
    );
  }

  // Écran d'erreur si le cloud n'est pas disponible
  if (isCloudAvailable === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-teal-800 to-cyan-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
              <WifiOff className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Connexion requise
            </h2>
            <p className="text-gray-600 mb-6">
              Une connexion internet est nécessaire pour créer votre compte.
              Veuillez vérifier votre connexion et réessayer.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm text-amber-800">
                <strong>Serveur :</strong> {appConfig.CLOUD_SERVER_URL}
              </p>
            </div>
            <button
              onClick={checkCloudConnection}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
              Réessayer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-teal-800 to-cyan-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Pharmacie Manager
          </h1>
          <p className="text-emerald-200">
            Configuration initiale de votre application
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
              step >= 1 ? 'bg-emerald-500 text-white' : 'bg-white/20 text-white/50'
            }`}>
              {step > 1 ? <CheckCircle className="w-5 h-5" /> : '1'}
            </div>
            <div className={`w-16 h-1 rounded ${step >= 2 ? 'bg-emerald-500' : 'bg-white/20'}`} />
            <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
              step >= 2 ? 'bg-emerald-500 text-white' : 'bg-white/20 text-white/50'
            }`}>
              {step > 2 ? <CheckCircle className="w-5 h-5" /> : '2'}
            </div>
            <div className={`w-16 h-1 rounded ${step >= 3 ? 'bg-emerald-500' : 'bg-white/20'}`} />
            <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
              step >= 3 ? 'bg-emerald-500 text-white' : 'bg-white/20 text-white/50'
            }`}>
              {step >= 3 ? <CheckCircle className="w-5 h-5" /> : '3'}
            </div>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Step 1: Pharmacy Info */}
          {step === 1 && (
            <div className="p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Informations de la pharmacie
              </h2>
              <p className="text-gray-500 mb-6">
                Configurez les informations de votre établissement
              </p>
              
              {/* Info Cloud */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex gap-3">
                <Cloud className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium">Votre compte sera créé sur notre serveur cloud</p>
                  <p className="text-blue-600">Cela permet la sauvegarde et la synchronisation de vos données.</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom de la pharmacie *
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={pharmacyData.name}
                      onChange={(e) => setPharmacyData({ ...pharmacyData, name: e.target.value })}
                      className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                        errors.pharmacyName ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Pharmacie du Centre"
                    />
                  </div>
                  {errors.pharmacyName && (
                    <p className="text-red-500 text-sm mt-1">{errors.pharmacyName}</p>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Adresse
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={pharmacyData.address}
                        onChange={(e) => setPharmacyData({ ...pharmacyData, address: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        placeholder="123 Rue Principale"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ville
                    </label>
                    <input
                      type="text"
                      value={pharmacyData.city}
                      onChange={(e) => setPharmacyData({ ...pharmacyData, city: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      placeholder="Conakry"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Téléphone
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="tel"
                        value={pharmacyData.phone}
                        onChange={(e) => setPharmacyData({ ...pharmacyData, phone: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        placeholder="+224 XXX XXX XXX"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="email"
                        value={pharmacyData.email}
                        onChange={(e) => setPharmacyData({ ...pharmacyData, email: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        placeholder="contact@pharmacie.com"
                      />
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Numéro de licence
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={pharmacyData.license_number}
                      onChange={(e) => setPharmacyData({ ...pharmacyData, license_number: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      placeholder="PHARMA-2024-001"
                    />
                  </div>
                </div>
              </div>
              
              <button
                onClick={handleNext}
                className="w-full mt-6 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                Continuer
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Step 2: Admin Info */}
          {step === 2 && (
            <div className="p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Créer votre compte administrateur
              </h2>
              <p className="text-gray-500 mb-6">
                Ces identifiants vous permettront de vous connecter
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom complet *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={adminData.full_name}
                      onChange={(e) => setAdminData({ ...adminData, full_name: e.target.value })}
                      className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                        errors.fullName ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Dr. Jean Dupont"
                    />
                  </div>
                  {errors.fullName && (
                    <p className="text-red-500 text-sm mt-1">{errors.fullName}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      value={adminData.email}
                      onChange={(e) => setAdminData({ ...adminData, email: e.target.value })}
                      className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                        errors.email ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="admin@pharmacie.com"
                    />
                  </div>
                  {errors.email && (
                    <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom d'utilisateur *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={adminData.username}
                      onChange={(e) => setAdminData({ ...adminData, username: e.target.value })}
                      className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                        errors.username ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="admin"
                    />
                  </div>
                  {errors.username && (
                    <p className="text-red-500 text-sm mt-1">{errors.username}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mot de passe *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="password"
                      value={adminData.password}
                      onChange={(e) => setAdminData({ ...adminData, password: e.target.value })}
                      className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                        errors.password ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="••••••••"
                    />
                  </div>
                  {errors.password && (
                    <p className="text-red-500 text-sm mt-1">{errors.password}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirmer le mot de passe *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="password"
                      value={adminData.confirmPassword}
                      onChange={(e) => setAdminData({ ...adminData, confirmPassword: e.target.value })}
                      className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                        errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="••••••••"
                    />
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>
                  )}
                </div>
              </div>
              
              {/* Erreur cloud */}
              {cloudError && (
                <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium">Attention : erreur cloud</p>
                    <p className="text-amber-600">{cloudError}</p>
                    <p className="text-amber-600 mt-1">L'app fonctionnera en mode local uniquement.</p>
                  </div>
                </div>
              )}
              
              <div className="flex gap-4 mt-6">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-4 rounded-lg transition-colors"
                >
                  Retour
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Configuration...
                    </>
                  ) : (
                    <>
                      Terminer la configuration
                      <CheckCircle className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Success */}
          {step === 3 && (
            <div className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-100 mb-6">
                <CheckCircle className="w-10 h-10 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Configuration terminée !
              </h2>
              <p className="text-gray-500 mb-6">
                Votre compte a été créé avec succès.
                <br />
                Vous allez être redirigé vers la page de connexion...
              </p>
              <div className="bg-emerald-50 rounded-lg p-4 text-left">
                <p className="text-sm text-emerald-800">
                  <strong>Email :</strong> {adminData.email}
                </p>
                <p className="text-sm text-emerald-800 mt-1">
                  <strong>Pharmacie :</strong> {pharmacyData.name}
                </p>
                <p className="text-sm text-emerald-800 mt-1 flex items-center gap-1">
                  <Cloud className="w-4 h-4" />
                  <strong>Cloud :</strong> ✅ Compte enregistré
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-emerald-200 text-sm mt-6">
          © 2024 Pharmacie Manager - Tous droits réservés
        </p>
      </div>
    </div>
  );
}
