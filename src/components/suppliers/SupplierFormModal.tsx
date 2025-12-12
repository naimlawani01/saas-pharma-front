import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import Modal from '@/components/ui/Modal';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

interface SupplierFormData {
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  country: string;
  order_url: string;
  is_active: boolean;
}

interface SupplierFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier?: any;
}

const initialFormData: SupplierFormData = {
  name: '',
  contact_person: '',
  phone: '',
  email: '',
  address: '',
  city: 'Conakry',
  country: 'Guinée',
  order_url: '',
  is_active: true,
};

export default function SupplierFormModal({ isOpen, onClose, supplier }: SupplierFormModalProps) {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isEditing = !!supplier;
  
  const [formData, setFormData] = useState<SupplierFormData>(initialFormData);

  useEffect(() => {
    if (isOpen && supplier) {
      setFormData({
        name: supplier.name || '',
        contact_person: supplier.contact_person || '',
        phone: supplier.phone || '',
        email: supplier.email || '',
        address: supplier.address || '',
        city: supplier.city || 'Conakry',
        country: supplier.country || 'Guinée',
        order_url: supplier.order_url || '',
        is_active: supplier.is_active ?? true,
      });
    } else if (isOpen) {
      setFormData(initialFormData);
    }
  }, [isOpen, supplier]);

  const createMutation = useMutation({
    mutationFn: async (data: SupplierFormData) => {
      return api.post('/suppliers', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('Fournisseur créé avec succès');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Erreur lors de la création');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: SupplierFormData) => {
      return api.put(`/suppliers/${supplier.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('Fournisseur modifié avec succès');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Erreur lors de la modification');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Le nom du fournisseur est requis');
      return;
    }

    if (!user?.pharmacy_id) {
      toast.error('Erreur : aucune pharmacie associée à votre compte');
      return;
    }

    // Préparer les données pour l'API
    const dataToSend: any = {
      name: formData.name.trim(),
      contact_person: formData.contact_person.trim() || null,
      phone: formData.phone.trim() || null,
      email: formData.email.trim() || null,
      address: formData.address.trim() || null,
      city: formData.city.trim() || null,
      country: formData.country.trim() || null,
      order_url: formData.order_url.trim() || null,
      tax_id: null,
      payment_terms: null,
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
      title={isEditing ? 'Modifier le fournisseur' : 'Ajouter un fournisseur'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Nom */}
          <div className="md:col-span-2">
            <label className="label">Nom de l'entreprise *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input"
              placeholder="Ex: PharmaDistri Guinée"
              required
            />
          </div>

          {/* Contact */}
          <div>
            <label className="label">Personne de contact</label>
            <input
              type="text"
              value={formData.contact_person}
              onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
              className="input"
              placeholder="Nom du contact"
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
          <div className="md:col-span-2">
            <label className="label">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="input"
              placeholder="contact@fournisseur.com"
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

          {/* Pays */}
          <div>
            <label className="label">Pays</label>
            <input
              type="text"
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              className="input"
              placeholder="Guinée"
            />
          </div>

          {/* Lien pour commander */}
          <div className="md:col-span-2">
            <label className="label">Lien pour passer commande</label>
            <input
              type="url"
              value={formData.order_url}
              onChange={(e) => setFormData({ ...formData, order_url: e.target.value })}
              className="input"
              placeholder="https://exemple.com/commande"
            />
            <p className="text-xs text-gray-500 mt-1">
              URL du site web ou de la plateforme de commande du fournisseur
            </p>
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
              <span className="text-sm text-gray-700">Fournisseur actif</span>
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
            {isEditing ? 'Enregistrer' : 'Créer le fournisseur'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

