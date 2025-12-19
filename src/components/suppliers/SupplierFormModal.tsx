import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import Modal from '@/components/ui/Modal';
import toast from 'react-hot-toast';
import { Loader2, AlertCircle, X } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { parseErrors, scrollToTop } from '@/utils/errorHandler';

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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

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
    // Réinitialiser les erreurs quand on ouvre/ferme le modal
    setErrors({});
    setGeneralError(null);
  }, [isOpen, supplier]);

  const createMutation = useMutation({
    mutationFn: async (data: SupplierFormData) => {
      return api.post('/suppliers', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('Fournisseur créé avec succès');
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
    mutationFn: async (data: SupplierFormData) => {
      return api.put(`/suppliers/${supplier.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('Fournisseur modifié avec succès');
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
    
    if (!formData.name.trim()) {
      clientErrors.name = 'Le nom du fournisseur est requis';
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
          {/* Nom */}
          <div className="md:col-span-2">
            <label className="label">Nom de l'entreprise *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                if (errors.name) setErrors({ ...errors, name: '' });
              }}
              className={`input ${errors.name ? 'border-red-500 focus:ring-red-500' : ''}`}
              placeholder="Ex: PharmaDistri Guinée"
              required
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.name}
              </p>
            )}
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
          <div className="md:col-span-2">
            <label className="label">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => {
                setFormData({ ...formData, email: e.target.value });
                if (errors.email) setErrors({ ...errors, email: '' });
              }}
              className={`input ${errors.email ? 'border-red-500 focus:ring-red-500' : ''}`}
              placeholder="contact@fournisseur.com"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.email}
              </p>
            )}
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

