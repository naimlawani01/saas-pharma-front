import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { isFeatureEnabled, getBusinessConfig } from '@/config/businessConfig';
import Modal from '@/components/ui/Modal';
import toast from 'react-hot-toast';
import { Loader2, AlertCircle, X } from 'lucide-react';
import { parseErrors, scrollToTop } from '@/utils/errorHandler';

interface ProductFormData {
  name: string;
  description: string | null;
  barcode: string | null;
  sku: string | null;
  category_id: number | null;
  quantity: number;
  min_quantity: number;
  unit: string;
  purchase_price: number;
  selling_price: number;
  expiry_date: string | null;
  manufacturing_date: string | null;
  is_prescription_required: boolean;
  is_active: boolean;
  pharmacy_id?: number; // Optionnel car ajouté seulement lors de l'envoi
}

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: any; // Product to edit, null for create
}

const initialFormData: ProductFormData = {
  name: '',
  description: '',
  barcode: '',
  sku: '',
  category_id: null,
  quantity: 0,
  min_quantity: 10,
  unit: 'unit',
  purchase_price: 0,
  selling_price: 0,
  expiry_date: '',
  manufacturing_date: '',
  is_prescription_required: false,
  is_active: true,
};

const units = [
  { value: 'unit', label: 'Unité' },
  { value: 'box', label: 'Boîte' },
  { value: 'bottle', label: 'Flacon' },
  { value: 'pack', label: 'Paquet' },
  { value: 'tube', label: 'Tube' },
  { value: 'can', label: 'Boîte métal' },
  { value: 'roll', label: 'Rouleau' },
];

export default function ProductFormModal({ isOpen, onClose, product }: ProductFormModalProps) {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isEditing = !!product;
  const businessConfig = getBusinessConfig();
  
  // Fonctionnalités activées selon le type d'activité
  const showPrescriptionField = isFeatureEnabled('prescriptions');
  const showExpiryDates = isFeatureEnabled('expiryDates');
  const showBarcode = isFeatureEnabled('barcode');
  
  const [formData, setFormData] = useState<ProductFormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Charger les catégories
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await api.get('/products/categories');
      return response.data;
    },
  });

  // Reset form when modal opens/closes or product changes
  useEffect(() => {
    if (isOpen && product) {
      setFormData({
        name: product.name || '',
        description: product.description || '',
        barcode: product.barcode || '',
        sku: product.sku || '',
        category_id: product.category_id,
        quantity: product.quantity || 0,
        min_quantity: product.min_quantity || 10,
        unit: product.unit || 'unit',
        purchase_price: product.purchase_price || 0,
        selling_price: product.selling_price || 0,
        expiry_date: product.expiry_date ? product.expiry_date.split('T')[0] : '',
        manufacturing_date: product.manufacturing_date ? product.manufacturing_date.split('T')[0] : '',
        is_prescription_required: product.is_prescription_required || false,
        is_active: product.is_active ?? true,
      });
    } else if (isOpen) {
      setFormData(initialFormData);
    }
    // Réinitialiser les erreurs quand on ouvre/ferme le modal
    setErrors({});
    setGeneralError(null);
  }, [isOpen, product]);

  // Mutation pour créer
  const createMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      return api.post('/products', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Produit créé avec succès');
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

  // Mutation pour modifier
  const updateMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      return api.put(`/products/${product.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Produit modifié avec succès');
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
      clientErrors.name = `Le nom du ${businessConfig.terminology.product.toLowerCase()} est requis`;
    }
    if (formData.selling_price <= 0) {
      clientErrors.selling_price = 'Le prix de vente doit être supérieur à 0';
    }
    if (formData.quantity < 0) {
      clientErrors.quantity = 'La quantité ne peut pas être négative';
    }
    if (formData.min_quantity < 0) {
      clientErrors.min_quantity = 'Le stock minimum ne peut pas être négatif';
    }
    if (formData.purchase_price < 0) {
      clientErrors.purchase_price = 'Le prix d\'achat ne peut pas être négatif';
    }
    
    if (!user?.pharmacy_id) {
      setGeneralError(`Erreur : aucun(e) ${businessConfig.terminology.business.toLowerCase()} associé(e) à votre compte`);
      return;
    }
    
    // Si erreurs de validation, les afficher et arrêter
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      const modalContent = document.querySelector('.modal-content');
      if (modalContent) {
        modalContent.scrollTop = 0;
      }
      return;
    }

    // Préparer les données pour l'API (inclut pharmacy_id pour la création)
    const dataToSend: ProductFormData & { pharmacy_id: number } = {
      ...formData,
      pharmacy_id: user.pharmacy_id, // Ajouter l'ID de la pharmacie
      expiry_date: formData.expiry_date || null,
      manufacturing_date: formData.manufacturing_date || null,
      // Convertir les chaînes vides en null pour les champs optionnels
      barcode: formData.barcode || null,
      sku: formData.sku || null,
      description: formData.description || null,
      category_id: formData.category_id || null,
    };

    if (isEditing) {
      // Pour la mise à jour, on n'a pas besoin de pharmacy_id
      const { pharmacy_id, ...updateData } = dataToSend;
      updateMutation.mutate(updateData);
    } else {
      createMutation.mutate(dataToSend);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Modifier le ${businessConfig.terminology.product.toLowerCase()}` : `Ajouter un ${businessConfig.terminology.product.toLowerCase()}`}
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
            <label className="label">Nom du {businessConfig.terminology.product.toLowerCase()} *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                if (errors.name) setErrors({ ...errors, name: '' });
              }}
              className={`input ${errors.name ? 'border-red-500 focus:ring-red-500' : ''}`}
              placeholder={`Ex: ${businessConfig.id === 'pharmacy' ? 'Paracétamol 500mg' : 'Nom du produit'}`}
              required
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.name}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="md:col-span-2">
            <label className="label">Description</label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value || null })}
              className="input min-h-[80px]"
              placeholder="Description du produit..."
            />
          </div>

          {/* Code-barres - conditionnel */}
          {showBarcode && (
          <div>
            <label className="label">Code-barres</label>
            <input
              type="text"
              value={formData.barcode || ''}
              onChange={(e) => {
                setFormData({ ...formData, barcode: e.target.value || null });
                if (errors.barcode) setErrors({ ...errors, barcode: '' });
              }}
              className={`input ${errors.barcode ? 'border-red-500 focus:ring-red-500' : ''}`}
              placeholder="1234567890123"
            />
            {errors.barcode && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.barcode}
              </p>
            )}
          </div>
          )}

          {/* SKU */}
          <div>
            <label className="label">SKU / Référence</label>
            <input
              type="text"
              value={formData.sku || ''}
              onChange={(e) => {
                setFormData({ ...formData, sku: e.target.value || null });
                if (errors.sku) setErrors({ ...errors, sku: '' });
              }}
              className={`input ${errors.sku ? 'border-red-500 focus:ring-red-500' : ''}`}
              placeholder="REF001"
            />
            {errors.sku && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.sku}
              </p>
            )}
          </div>

          {/* Catégorie */}
          <div>
            <label className="label">Catégorie</label>
            <select
              value={formData.category_id || ''}
              onChange={(e) => setFormData({ ...formData, category_id: e.target.value ? parseInt(e.target.value) : null })}
              className="input"
            >
              <option value="">-- Sélectionner --</option>
              {categories?.map((cat: any) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* Unité */}
          <div>
            <label className="label">Unité</label>
            <select
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              className="input"
            >
              {units.map((unit) => (
                <option key={unit.value} value={unit.value}>{unit.label}</option>
              ))}
            </select>
          </div>

          {/* Prix d'achat */}
          <div>
            <label className="label">Prix d'achat (GNF)</label>
            <input
              type="number"
              value={formData.purchase_price}
              onChange={(e) => {
                setFormData({ ...formData, purchase_price: parseFloat(e.target.value) || 0 });
                if (errors.purchase_price) setErrors({ ...errors, purchase_price: '' });
              }}
              className={`input ${errors.purchase_price ? 'border-red-500 focus:ring-red-500' : ''}`}
              min="0"
              step="100"
            />
            {errors.purchase_price && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.purchase_price}
              </p>
            )}
          </div>

          {/* Prix de vente */}
          <div>
            <label className="label">Prix de vente (GNF) *</label>
            <input
              type="number"
              value={formData.selling_price}
              onChange={(e) => {
                setFormData({ ...formData, selling_price: parseFloat(e.target.value) || 0 });
                if (errors.selling_price) setErrors({ ...errors, selling_price: '' });
              }}
              className={`input ${errors.selling_price ? 'border-red-500 focus:ring-red-500' : ''}`}
              min="0"
              step="100"
              required
            />
            {errors.selling_price && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.selling_price}
              </p>
            )}
          </div>

          {/* Quantité */}
          <div>
            <label className="label">Quantité en stock</label>
            <input
              type="number"
              value={formData.quantity}
              onChange={(e) => {
                setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 });
                if (errors.quantity) setErrors({ ...errors, quantity: '' });
              }}
              className={`input ${errors.quantity ? 'border-red-500 focus:ring-red-500' : ''}`}
              min="0"
            />
            {errors.quantity && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.quantity}
              </p>
            )}
          </div>

          {/* Quantité minimum */}
          <div>
            <label className="label">Stock minimum (alerte)</label>
            <input
              type="number"
              value={formData.min_quantity}
              onChange={(e) => {
                setFormData({ ...formData, min_quantity: parseInt(e.target.value) || 0 });
                if (errors.min_quantity) setErrors({ ...errors, min_quantity: '' });
              }}
              className={`input ${errors.min_quantity ? 'border-red-500 focus:ring-red-500' : ''}`}
              min="0"
            />
            {errors.min_quantity && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.min_quantity}
              </p>
            )}
          </div>

          {/* Dates de fabrication et expiration - conditionnelles */}
          {showExpiryDates && (
            <>
          <div>
            <label className="label">Date de fabrication</label>
            <input
              type="date"
              value={formData.manufacturing_date || ''}
              onChange={(e) => setFormData({ ...formData, manufacturing_date: e.target.value || null })}
              className="input"
            />
          </div>

          <div>
            <label className="label">Date d'expiration</label>
            <input
              type="date"
              value={formData.expiry_date || ''}
              onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value || null })}
              className="input"
            />
          </div>
            </>
          )}

          {/* Options */}
          <div className="md:col-span-2 space-y-4">
            {/* Option ordonnance - toujours visible */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_prescription_required}
                  onChange={(e) => setFormData({ ...formData, is_prescription_required: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-orange-600" />
                    Nécessite une ordonnance
                  </span>
                  <p className="text-xs text-gray-600 mt-1">
                    {showPrescriptionField 
                      ? "Cochez cette case si ce produit nécessite une prescription médicale"
                      : "Cochez cette case si ce produit nécessite normalement une ordonnance (le pharmacien pourra quand même valider la vente)"}
                  </p>
                </div>
              </label>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">{businessConfig.terminology.product} actif</span>
                  <p className="text-xs text-gray-600 mt-1">Désactivez pour masquer ce produit des ventes</p>
                </div>
              </label>
            </div>
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
            {isEditing ? 'Enregistrer' : (() => {
              const productName = businessConfig.terminology.product.toLowerCase();
              // Gérer l'élision pour les mots commençant par une voyelle ou 'h'
              const article = /^[aeiouh]/.test(productName) ? "l'" : "le ";
              return `Créer ${article}${productName}`;
            })()}
          </button>
        </div>
      </form>
    </Modal>
  );
}

