import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import Modal from '@/components/ui/Modal';
import toast from 'react-hot-toast';
import { Loader2, AlertCircle, X } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { parseErrors, scrollToTop } from '@/utils/errorHandler';

interface CustomerFormData {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  date_of_birth: string | null;
  medical_notes: string;
  allergies: string;
  is_active: boolean;
}

interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer?: any;
}

const initialFormData: CustomerFormData = {
  first_name: '',
  last_name: '',
  phone: '',
  email: '',
  address: '',
  city: 'Conakry',
  date_of_birth: '',
  medical_notes: '',
  allergies: '',
  is_active: true,
};

export default function CustomerFormModal({ isOpen, onClose, customer }: CustomerFormModalProps) {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isEditing = !!customer;
  
  const [formData, setFormData] = useState<CustomerFormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && customer) {
      setFormData({
        first_name: customer.first_name || '',
        last_name: customer.last_name || '',
        phone: customer.phone || '',
        email: customer.email || '',
        address: customer.address || '',
        city: customer.city || 'Conakry',
        date_of_birth: customer.date_of_birth ? customer.date_of_birth.split('T')[0] : '',
        medical_notes: customer.medical_notes || '',
        allergies: customer.allergies || '',
        is_active: customer.is_active ?? true,
      });
    } else if (isOpen) {
      setFormData(initialFormData);
    }
    // Réinitialiser les erreurs quand on ouvre/ferme le modal
    setErrors({});
    setGeneralError(null);
  }, [isOpen, customer]);

  const createMutation = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      return api.post('/customers', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Client créé avec succès');
      setErrors({});
      setGeneralError(null);
      onClose();
    },
    onError: (error: any) => {
      const { fieldErrors, generalError: genError } = parseErrors(error);
      setErrors(fieldErrors);
      setGeneralError(genError);
      scrollToTop();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      return api.put(`/customers/${customer.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Client modifié avec succès');
      setErrors({});
      setGeneralError(null);
      onClose();
    },
    onError: (error: any) => {
      const { fieldErrors, generalError: genError } = parseErrors(error);
      setErrors(fieldErrors);
      setGeneralError(genError);
      scrollToTop();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Réinitialiser les erreurs
    setErrors({});
    setGeneralError(null);
    
    // Validation côté client
    const clientErrors: Record<string, string> = {};
    
    if (!formData.first_name.trim()) {
      clientErrors.first_name = 'Le prénom est requis';
    }
    if (!formData.last_name.trim()) {
      clientErrors.last_name = 'Le nom est requis';
    }

    if (!user?.pharmacy_id) {
      setGeneralError('Erreur : aucune pharmacie associée à votre compte');
      return;
    }
    
    // Si erreurs de validation, les afficher et arrêter
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      scrollToTop();
      return;
    }

    // Préparer les données pour l'API
    const dataToSend: any = {
      first_name: formData.first_name.trim(),
      last_name: formData.last_name.trim(),
      phone: formData.phone.trim() || null,
      email: formData.email.trim() || null,
      address: formData.address.trim() || null,
      city: formData.city.trim() || null,
      date_of_birth: formData.date_of_birth ? new Date(formData.date_of_birth).toISOString() : null,
      medical_notes: formData.medical_notes.trim() || null,
      allergies: formData.allergies.trim() || null,
    };

    if (isEditing) {
      // Pour la mise à jour, ajouter is_active si nécessaire
      const updateData: any = { ...dataToSend };
      if (formData.is_active !== undefined) {
        updateData.is_active = formData.is_active;
      }
      updateMutation.mutate(updateData);
    } else {
      // Pour la création, ajouter pharmacy_id
      createMutation.mutate({
        ...dataToSend,
        pharmacy_id: user.pharmacy_id,
      });
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Modifier le client' : 'Ajouter un client'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Affichage des erreurs générales */}
        {generalError && (
          <div className="mb-4 flex items-start gap-3 rounded-lg border-l-4 border-red-400 bg-red-50 p-4 text-red-700">
            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium">{generalError}</p>
            </div>
            <button
              type="button"
              onClick={() => setGeneralError(null)}
              className="flex-shrink-0 p-1 hover:bg-red-100 rounded"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Prénom */}
          <div>
            <label className="label">Prénom *</label>
            <input
              type="text"
              value={formData.first_name}
              onChange={(e) => {
                setFormData({ ...formData, first_name: e.target.value });
                if (errors.first_name) setErrors({ ...errors, first_name: '' });
              }}
              className={`input ${errors.first_name ? 'border-red-500 focus:ring-red-500' : ''}`}
              placeholder="Prénom"
              required
            />
            {errors.first_name && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.first_name}
              </p>
            )}
          </div>

          {/* Nom */}
          <div>
            <label className="label">Nom *</label>
            <input
              type="text"
              value={formData.last_name}
              onChange={(e) => {
                setFormData({ ...formData, last_name: e.target.value });
                if (errors.last_name) setErrors({ ...errors, last_name: '' });
              }}
              className={`input ${errors.last_name ? 'border-red-500 focus:ring-red-500' : ''}`}
              placeholder="Nom"
              required
            />
            {errors.last_name && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.last_name}
              </p>
            )}
          </div>

          {/* Téléphone */}
          <div>
            <label className="label">Téléphone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => {
                setFormData({ ...formData, phone: e.target.value });
                if (errors.phone) setErrors({ ...errors, phone: '' });
              }}
              className={`input ${errors.phone ? 'border-red-500 focus:ring-red-500' : ''}`}
              placeholder="+224 6XX XX XX XX"
            />
            {errors.phone && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.phone}
              </p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => {
                setFormData({ ...formData, email: e.target.value });
                if (errors.email) setErrors({ ...errors, email: '' });
              }}
              className={`input ${errors.email ? 'border-red-500 focus:ring-red-500' : ''}`}
              placeholder="email@exemple.com"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.email}
              </p>
            )}
          </div>

          {/* Date de naissance */}
          <div>
            <label className="label">Date de naissance</label>
            <input
              type="date"
              value={formData.date_of_birth || ''}
              onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value || null })}
              className="input"
            />
          </div>

          {/* Adresse */}
          <div className="md:col-span-2">
            <label className="label">Adresse</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="input"
              placeholder="Adresse complète"
            />
          </div>

          {/* Ville */}
          <div>
            <label className="label">Ville</label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              className="input"
              placeholder="Conakry"
            />
          </div>

          {/* Allergies */}
          <div className="md:col-span-2">
            <label className="label">Allergies connues</label>
            <input
              type="text"
              value={formData.allergies}
              onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
              className="input"
              placeholder="Ex: Pénicilline, Aspirine..."
            />
          </div>

          {/* Historique médical */}
          <div className="md:col-span-2">
            <label className="label">Notes médicales</label>
            <textarea
              value={formData.medical_notes}
              onChange={(e) => setFormData({ ...formData, medical_notes: e.target.value })}
              className="input min-h-[80px]"
              placeholder="Informations médicales importantes..."
            />
          </div>

          {/* Actif */}
          <div className="md:col-span-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">Client actif</span>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="btn-secondary"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary flex items-center gap-2"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isEditing ? 'Enregistrer' : 'Créer le client'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

