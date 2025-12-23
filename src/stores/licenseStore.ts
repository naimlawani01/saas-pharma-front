import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '@/services/api';
import { generateHardwareId, getSystemInfo } from '@/services/hardwareId';

interface LicenseState {
  // État de la licence
  isActivated: boolean;
  licenseKey: string | null;
  activationToken: string | null;
  hardwareId: string | null;
  licenseStatus: 'active' | 'expired' | 'revoked' | 'suspended' | 'none' | null;
  expiresAt: string | null;
  lastVerifiedAt: string | null;
  
  // État de chargement
  isLoading: boolean;
  error: string | null;
  
  // Actions
  activate: (licenseKey: string) => Promise<{ success: boolean; message: string }>;
  verify: () => Promise<{ valid: boolean; message: string }>;
  deactivate: () => Promise<void>;
  clearError: () => void;
  initialize: () => Promise<void>;
}

export const useLicenseStore = create<LicenseState>()(
  persist(
    (set, get) => ({
      // État initial
      isActivated: false,
      licenseKey: null,
      activationToken: null,
      hardwareId: null,
      licenseStatus: null,
      expiresAt: null,
      lastVerifiedAt: null,
      isLoading: false,
      error: null,

      // Initialiser le Hardware ID et vérifier la licence
      initialize: async () => {
        try {
          set({ isLoading: true, error: null });
          
          // Générer ou récupérer le Hardware ID
          let hardwareId = get().hardwareId;
          if (!hardwareId) {
            hardwareId = await generateHardwareId();
            set({ hardwareId });
          }
          
          // Vérifier la licence si elle est activée
          const activationToken = get().activationToken;
          if (activationToken) {
            await get().verify();
          }
        } catch (error: any) {
          console.error('Erreur lors de l\'initialisation de la licence:', error);
          set({ error: error.message || 'Erreur lors de l\'initialisation' });
        } finally {
          set({ isLoading: false });
        }
      },

      // Activer une licence
      activate: async (licenseKey: string) => {
        try {
          set({ isLoading: true, error: null });
          
          // Générer ou récupérer le Hardware ID
          let hardwareId = get().hardwareId;
          if (!hardwareId) {
            hardwareId = await generateHardwareId();
            set({ hardwareId });
          }
          
          // Obtenir les informations système
          const systemInfo = await getSystemInfo();
          
          // Appeler l'API d'activation
          const response = await api.post('/license/activate', {
            license_key: licenseKey.trim().toUpperCase(),
            hardware_id: hardwareId,
            machine_name: systemInfo.machineName,
            os_info: `${systemInfo.osInfo} (${systemInfo.platform}/${systemInfo.arch})`,
          });
          
          const data = response.data;
          
          if (data.success && data.activation_token) {
            set({
              isActivated: true,
              licenseKey: licenseKey.trim().toUpperCase(),
              activationToken: data.activation_token,
              licenseStatus: 'active',
              error: null,
            });
            
            return {
              success: true,
              message: data.message || 'Licence activée avec succès.',
            };
          } else {
            throw new Error(data.message || 'Erreur lors de l\'activation');
          }
        } catch (error: any) {
          const errorMessage = error.response?.data?.detail || error.message || 'Erreur lors de l\'activation de la licence.';
          set({ error: errorMessage });
          return {
            success: false,
            message: errorMessage,
          };
        } finally {
          set({ isLoading: false });
        }
      },

      // Vérifier la validité de la licence
      verify: async () => {
        try {
          set({ isLoading: true, error: null });
          
          const hardwareId = get().hardwareId;
          const activationToken = get().activationToken;
          
          if (!hardwareId && !activationToken) {
            set({
              isActivated: false,
              licenseStatus: 'none',
            });
            return {
              valid: false,
              message: 'Aucune licence activée.',
            };
          }
          
          // Appeler l'API de vérification
          const response = await api.post('/license/verify', {
            hardware_id: hardwareId,
            activation_token: activationToken,
          });
          
          const data = response.data;
          
          if (data.valid) {
            set({
              isActivated: true,
              licenseStatus: (data.license_status as any) || 'active',
              expiresAt: data.expires_at || null,
              lastVerifiedAt: new Date().toISOString(),
              error: null,
            });
            
            return {
              valid: true,
              message: data.message || 'Licence valide.',
            };
          } else {
            // Licence invalide
            set({
              isActivated: false,
              licenseStatus: (data.license_status as any) || 'none',
              error: data.message || 'Licence invalide.',
            });
            
            return {
              valid: false,
              message: data.message || 'Licence invalide.',
            };
          }
        } catch (error: any) {
          const errorMessage = error.response?.data?.detail || error.message || 'Erreur lors de la vérification.';
          set({
            isActivated: false,
            error: errorMessage,
          });
          return {
            valid: false,
            message: errorMessage,
          };
        } finally {
          set({ isLoading: false });
        }
      },

      // Désactiver la licence sur cette machine
      deactivate: async () => {
        try {
          set({ isLoading: true, error: null });
          
          const hardwareId = get().hardwareId;
          const activationToken = get().activationToken;
          
          if (hardwareId || activationToken) {
            await api.post('/license/deactivate', {
              hardware_id: hardwareId,
              activation_token: activationToken,
            });
          }
          
          // Réinitialiser l'état
          set({
            isActivated: false,
            licenseKey: null,
            activationToken: null,
            licenseStatus: null,
            expiresAt: null,
            lastVerifiedAt: null,
            error: null,
          });
        } catch (error: any) {
          console.error('Erreur lors de la désactivation:', error);
          // Même en cas d'erreur, réinitialiser l'état local
          set({
            isActivated: false,
            licenseKey: null,
            activationToken: null,
            licenseStatus: null,
            expiresAt: null,
            lastVerifiedAt: null,
            error: null,
          });
        } finally {
          set({ isLoading: false });
        }
      },

      // Effacer l'erreur
      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'fanke-license-storage',
      partialize: (state) => ({
        licenseKey: state.licenseKey,
        activationToken: state.activationToken,
        hardwareId: state.hardwareId,
        licenseStatus: state.licenseStatus,
        expiresAt: state.expiresAt,
        lastVerifiedAt: state.lastVerifiedAt,
        isActivated: state.isActivated,
      }),
    }
  )
);

