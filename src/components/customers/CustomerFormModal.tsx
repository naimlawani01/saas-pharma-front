import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import Modal from '@/components/ui/Modal';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

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
  }, [isOpen, customer]);

  const createMutation = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      return api.post('/customers', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Client créé avec succès');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Erreur lors de la création');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      return api.put(`/customers/${customer.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Client modifié avec succès');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Erreur lors de la modification');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      toast.error('Le nom et prénom sont requis');
      return;
    }

    if (!user?.pharmacy_id) {
      toast.error('Erreur : aucune pharmacie associée à votre compte');
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Prénom */}
          <div>
            <label className="label">Prénom *</label>
            <input
              type="text"
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              className="input"
              placeholder="Prénom"
              required
            />
          </div>

          {/* Nom */}
          <div>
            <label className="label">Nom *</label>
            <input
              type="text"
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              className="input"
              placeholder="Nom"
              required
            />
          </div>

          {/* Téléphone */}
          <div>
            <label className="label">Téléphone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="input"
              placeholder="+224 6XX XX XX XX"
            />
          </div>

          {/* Email */}
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="input"
              placeholder="email@exemple.com"
            />
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

