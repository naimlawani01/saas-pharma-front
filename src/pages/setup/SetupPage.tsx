import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, User, Lock, Mail, Phone, MapPin, FileText, ArrowRight, CheckCircle, Loader2, Cloud, AlertTriangle, WifiOff, RefreshCw } from 'lucide-react';
import { api } from '@/services/api';
import { appConfig } from '@/config/appConfig';
import { businessTypes, BusinessType, setBusinessType } from '@/config/businessConfig';
import axios from 'axios';
import toast from 'react-hot-toast';

interface BusinessData {
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
  const [step, setStep] = useState(0); // Commence à 0 pour la sélection du type
  const [isLoading, setIsLoading] = useState(false);
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [isCloudAvailable, setIsCloudAvailable] = useState<boolean | null>(null);
  const [isCheckingCloud, setIsCheckingCloud] = useState(true);
  const [selectedBusinessType, setSelectedBusinessType] = useState<BusinessType>('general');
  
  const [businessData, setBusinessData] = useState<BusinessData>({
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

  // Configuration actuelle basée sur le type sélectionné
  const currentConfig = businessTypes[selectedBusinessType];

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

  const handleSelectBusinessType = (type: BusinessType) => {
    setSelectedBusinessType(type);
    setBusinessType(type); // Sauvegarder dans localStorage
  };

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};
    
    if (!businessData.name.trim()) {
      newErrors.businessName = `Le nom de votre ${currentConfig.terminology.business.toLowerCase()} est requis`;
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
    if (step === 0) {
      setStep(1);
    } else if (step === 1 && validateStep1()) {
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
        pharmacy_name: businessData.name, // Garder ce nom pour compatibilité backend
        pharmacy_address: businessData.address || null,
        pharmacy_city: businessData.city || null,
        pharmacy_phone: businessData.phone || null,
        pharmacy_email: businessData.email || null,
        pharmacy_license: businessData.license_number || null,
        business_type: selectedBusinessType, // Nouveau champ
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
          name: businessData.name,
          address: businessData.address || null,
          city: businessData.city || null,
          phone: businessData.phone || null,
          email: businessData.email || null,
          license_number: businessData.license_number || null,
          business_type: selectedBusinessType,
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
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-indigo-800 to-purple-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm mb-4">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Connexion au serveur...</h2>
          <p className="text-blue-200">Vérification de la connexion</p>
        </div>
      </div>
    );
  }

  // Écran d'erreur si le cloud n'est pas disponible
  if (isCloudAvailable === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-indigo-800 to-purple-900 flex items-center justify-center p-4">
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
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
              Réessayer
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Couleurs dynamiques basées sur le type d'activité
  const getGradientColors = () => {
    switch (selectedBusinessType) {
      case 'pharmacy': return 'from-emerald-900 via-emerald-800 to-teal-900';
      case 'grocery': return 'from-orange-900 via-orange-800 to-amber-900';
      case 'hardware': return 'from-slate-800 via-slate-700 to-gray-800';
      case 'cosmetics': return 'from-pink-900 via-pink-800 to-rose-900';
      case 'auto_parts': return 'from-blue-900 via-blue-800 to-sky-900';
      case 'clothing': return 'from-violet-900 via-violet-800 to-purple-900';
      case 'electronics': return 'from-cyan-900 via-cyan-800 to-teal-900';
      case 'restaurant': return 'from-amber-900 via-amber-800 to-orange-900';
      case 'wholesale': return 'from-indigo-900 via-indigo-800 to-blue-900';
      default: return 'from-blue-900 via-indigo-800 to-purple-900';
    }
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br ${getGradientColors()} flex items-center justify-center p-4 transition-colors duration-500`}>
      <div className="w-full max-w-3xl">
        {/* Header - Dynamique selon le type */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-sm mb-4 text-4xl shadow-xl">
            {step === 0 ? '🏪' : currentConfig.icon}
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {appConfig.APP_NAME}
          </h1>
          <p className="text-white/70">
            {step === 0 ? appConfig.APP_TAGLINE : `Configuration de votre ${currentConfig.terminology.business.toLowerCase()}`}
          </p>
        </div>

        {/* Progress Steps - Avec couleurs dynamiques */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-3">
            {[0, 1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full transition-all ${
                  step >= s 
                    ? 'bg-white text-gray-800 shadow-lg' 
                    : 'bg-white/20 text-white/50'
                }`}>
                  {step > s ? <CheckCircle className="w-5 h-5 text-green-600" /> : s + 1}
                </div>
                {s < 3 && (
                  <div className={`w-8 sm:w-12 h-1 rounded mx-2 transition-all ${
                    step > s ? 'bg-white' : 'bg-white/20'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* Labels des étapes */}
        <div className="flex justify-center mb-6">
          <div className="flex items-center text-xs text-white/60 space-x-8 sm:space-x-14">
            <span className={step === 0 ? 'text-white font-medium' : ''}>Type</span>
            <span className={step === 1 ? 'text-white font-medium' : ''}>Infos</span>
            <span className={step === 2 ? 'text-white font-medium' : ''}>Compte</span>
            <span className={step === 3 ? 'text-white font-medium' : ''}>Terminé</span>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Step 0: Business Type Selection */}
          {step === 0 && (
            <div className="p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Quel est votre type d'activité ?
              </h2>
              <p className="text-gray-500 mb-6">
                Sélectionnez le type qui correspond le mieux à votre commerce
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                {Object.values(businessTypes).map((type) => {
                  const isSelected = selectedBusinessType === type.id;
                  const colorClasses: Record<string, string> = {
                    pharmacy: 'border-emerald-500 bg-emerald-50 ring-emerald-200',
                    grocery: 'border-orange-500 bg-orange-50 ring-orange-200',
                    hardware: 'border-slate-500 bg-slate-50 ring-slate-200',
                    cosmetics: 'border-pink-500 bg-pink-50 ring-pink-200',
                    auto_parts: 'border-blue-500 bg-blue-50 ring-blue-200',
                    clothing: 'border-violet-500 bg-violet-50 ring-violet-200',
                    electronics: 'border-cyan-500 bg-cyan-50 ring-cyan-200',
                    restaurant: 'border-amber-500 bg-amber-50 ring-amber-200',
                    wholesale: 'border-indigo-500 bg-indigo-50 ring-indigo-200',
                    general: 'border-gray-500 bg-gray-50 ring-gray-200',
                  };
                  return (
                    <button
                      key={type.id}
                      onClick={() => handleSelectBusinessType(type.id)}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        isSelected
                          ? `${colorClasses[type.id]} ring-2`
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="text-3xl mb-2">{type.icon}</div>
                      <div className="font-semibold text-gray-900 text-sm">{type.name}</div>
                      <div className="text-xs text-gray-500 mt-1 line-clamp-2">{type.description}</div>
                    </button>
                  );
                })}
              </div>
              
              {/* Info sur le type sélectionné */}
              <div className={`rounded-xl p-4 mb-6 border ${
                selectedBusinessType === 'pharmacy' ? 'bg-emerald-50 border-emerald-200' :
                selectedBusinessType === 'grocery' ? 'bg-orange-50 border-orange-200' :
                selectedBusinessType === 'hardware' ? 'bg-slate-50 border-slate-200' :
                selectedBusinessType === 'cosmetics' ? 'bg-pink-50 border-pink-200' :
                selectedBusinessType === 'auto_parts' ? 'bg-blue-50 border-blue-200' :
                selectedBusinessType === 'clothing' ? 'bg-violet-50 border-violet-200' :
                selectedBusinessType === 'electronics' ? 'bg-cyan-50 border-cyan-200' :
                selectedBusinessType === 'restaurant' ? 'bg-amber-50 border-amber-200' :
                selectedBusinessType === 'wholesale' ? 'bg-indigo-50 border-indigo-200' :
                'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-start gap-4">
                  <div className="text-4xl">{currentConfig.icon}</div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900 text-lg">{currentConfig.name}</p>
                    <p className="text-sm text-gray-600 mt-1">{currentConfig.description}</p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {currentConfig.features.prescriptions && (
                        <span className="px-2 py-1 bg-white/80 rounded-full text-xs font-medium text-gray-700">📋 Ordonnances</span>
                      )}
                      {currentConfig.features.expiryDates && (
                        <span className="px-2 py-1 bg-white/80 rounded-full text-xs font-medium text-gray-700">📅 Expiration</span>
                      )}
                      {currentConfig.features.barcode && (
                        <span className="px-2 py-1 bg-white/80 rounded-full text-xs font-medium text-gray-700">📊 Code-barres</span>
                      )}
                      {currentConfig.features.variants && (
                        <span className="px-2 py-1 bg-white/80 rounded-full text-xs font-medium text-gray-700">🎨 Variantes</span>
                      )}
                      {currentConfig.features.batchNumbers && (
                        <span className="px-2 py-1 bg-white/80 rounded-full text-xs font-medium text-gray-700">📦 N° Lot</span>
                      )}
                      <span className="px-2 py-1 bg-white/80 rounded-full text-xs font-medium text-gray-700">💰 Ventes</span>
                      <span className="px-2 py-1 bg-white/80 rounded-full text-xs font-medium text-gray-700">📦 Stock</span>
                      <span className="px-2 py-1 bg-white/80 rounded-full text-xs font-medium text-gray-700">👥 Clients</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <button
                onClick={handleNext}
                className={`w-full text-white font-semibold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] ${
                  selectedBusinessType === 'pharmacy' ? 'bg-emerald-600 hover:bg-emerald-700' :
                  selectedBusinessType === 'grocery' ? 'bg-orange-600 hover:bg-orange-700' :
                  selectedBusinessType === 'hardware' ? 'bg-slate-600 hover:bg-slate-700' :
                  selectedBusinessType === 'cosmetics' ? 'bg-pink-600 hover:bg-pink-700' :
                  selectedBusinessType === 'auto_parts' ? 'bg-blue-600 hover:bg-blue-700' :
                  selectedBusinessType === 'clothing' ? 'bg-violet-600 hover:bg-violet-700' :
                  selectedBusinessType === 'electronics' ? 'bg-cyan-600 hover:bg-cyan-700' :
                  selectedBusinessType === 'restaurant' ? 'bg-amber-600 hover:bg-amber-700' :
                  selectedBusinessType === 'wholesale' ? 'bg-indigo-600 hover:bg-indigo-700' :
                  'bg-gray-600 hover:bg-gray-700'
                }`}
              >
                Commencer avec {currentConfig.name}
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Step 1: Business Info */}
          {step === 1 && (
            <div className="p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Informations de votre {currentConfig.terminology.business.toLowerCase()}
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
                    Nom de votre {currentConfig.terminology.business.toLowerCase()} *
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={businessData.name}
                      onChange={(e) => setBusinessData({ ...businessData, name: e.target.value })}
                      className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.businessName ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder={`${currentConfig.terminology.business} du Centre`}
                    />
                  </div>
                  {errors.businessName && (
                    <p className="text-red-500 text-sm mt-1">{errors.businessName}</p>
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
                        value={businessData.address}
                        onChange={(e) => setBusinessData({ ...businessData, address: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                      value={businessData.city}
                      onChange={(e) => setBusinessData({ ...businessData, city: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                        value={businessData.phone}
                        onChange={(e) => setBusinessData({ ...businessData, phone: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                        value={businessData.email}
                        onChange={(e) => setBusinessData({ ...businessData, email: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder={`contact@${currentConfig.terminology.business.toLowerCase()}.com`}
                      />
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {currentConfig.terminology.license}
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={businessData.license_number}
                      onChange={(e) => setBusinessData({ ...businessData, license_number: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder={currentConfig.terminology.licensePlaceholder}
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex gap-4 mt-6">
                <button
                  onClick={() => setStep(0)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-4 rounded-lg transition-colors"
                >
                  Retour
                </button>
              <button
                onClick={handleNext}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                Continuer
                <ArrowRight className="w-5 h-5" />
              </button>
              </div>
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
                      className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.fullName ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Jean Dupont"
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
                      className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.email ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="admin@exemple.com"
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
                      className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
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
                      className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
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
                      className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
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
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
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
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 mb-6 shadow-lg">
                <div className="text-5xl">{currentConfig.icon}</div>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                🎉 Configuration terminée !
              </h2>
              <p className="text-gray-500 mb-6">
                Votre {currentConfig.terminology.business.toLowerCase()} <strong>{businessData.name}</strong> est prêt(e) !
                <br />
                <span className="text-sm">Redirection vers la connexion...</span>
              </p>
              <div className={`rounded-xl p-5 text-left ${
                selectedBusinessType === 'pharmacy' ? 'bg-emerald-50' :
                selectedBusinessType === 'grocery' ? 'bg-orange-50' :
                selectedBusinessType === 'hardware' ? 'bg-slate-50' :
                selectedBusinessType === 'cosmetics' ? 'bg-pink-50' :
                selectedBusinessType === 'auto_parts' ? 'bg-blue-50' :
                selectedBusinessType === 'clothing' ? 'bg-violet-50' :
                selectedBusinessType === 'electronics' ? 'bg-cyan-50' :
                selectedBusinessType === 'restaurant' ? 'bg-amber-50' :
                selectedBusinessType === 'wholesale' ? 'bg-indigo-50' :
                'bg-gray-50'
              }`}>
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-200">
                  <div className="text-3xl">{currentConfig.icon}</div>
                  <div>
                    <p className="font-bold text-gray-900">{businessData.name}</p>
                    <p className="text-sm text-gray-600">{currentConfig.name}</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <p className="text-gray-700 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <strong>Email :</strong> {adminData.email}
                  </p>
                  <p className="text-gray-700 flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <strong>Utilisateur :</strong> {adminData.username}
                  </p>
                  <p className="text-green-700 flex items-center gap-2 pt-2">
                    <Cloud className="w-4 h-4" />
                    <strong>Cloud :</strong> ✅ Compte synchronisé
                  </p>
                </div>
              </div>
              <div className="mt-4 flex justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400"></div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-blue-200 text-sm mt-6">
          © 2024 {appConfig.APP_NAME} - Tous droits réservés
        </p>
      </div>
    </div>
  );
}
