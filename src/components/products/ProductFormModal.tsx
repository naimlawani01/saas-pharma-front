import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import Modal from '@/components/ui/Modal';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';

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
  
  const [formData, setFormData] = useState<ProductFormData>(initialFormData);

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
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Erreur lors de la création');
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
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Erreur lors de la modification');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Le nom du produit est requis');
      return;
    }
    if (formData.selling_price <= 0) {
      toast.error('Le prix de vente doit être supérieur à 0');
      return;
    }
    
    if (!user?.pharmacy_id) {
      toast.error('Erreur : aucune pharmacie associée à votre compte');
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
      title={isEditing ? 'Modifier le produit' : 'Ajouter un produit'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Nom */}
          <div className="md:col-span-2">
            <label className="label">Nom du produit *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input"
              placeholder="Ex: Paracétamol 500mg"
              required
            />
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

          {/* Code-barres */}
          <div>
            <label className="label">Code-barres</label>
            <input
              type="text"
              value={formData.barcode || ''}
              onChange={(e) => setFormData({ ...formData, barcode: e.target.value || null })}
              className="input"
              placeholder="1234567890123"
            />
          </div>

          {/* SKU */}
          <div>
            <label className="label">SKU / Référence</label>
            <input
              type="text"
              value={formData.sku || ''}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value || null })}
              className="input"
              placeholder="PARA001"
            />
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
              onChange={(e) => setFormData({ ...formData, purchase_price: parseFloat(e.target.value) || 0 })}
              className="input"
              min="0"
              step="100"
            />
          </div>

          {/* Prix de vente */}
          <div>
            <label className="label">Prix de vente (GNF) *</label>
            <input
              type="number"
              value={formData.selling_price}
              onChange={(e) => setFormData({ ...formData, selling_price: parseFloat(e.target.value) || 0 })}
              className="input"
              min="0"
              step="100"
              required
            />
          </div>

          {/* Quantité */}
          <div>
            <label className="label">Quantité en stock</label>
            <input
              type="number"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
              className="input"
              min="0"
            />
          </div>

          {/* Quantité minimum */}
          <div>
            <label className="label">Stock minimum (alerte)</label>
            <input
              type="number"
              value={formData.min_quantity}
              onChange={(e) => setFormData({ ...formData, min_quantity: parseInt(e.target.value) || 0 })}
              className="input"
              min="0"
            />
          </div>

          {/* Date de fabrication */}
          <div>
            <label className="label">Date de fabrication</label>
            <input
              type="date"
              value={formData.manufacturing_date || ''}
              onChange={(e) => setFormData({ ...formData, manufacturing_date: e.target.value || null })}
              className="input"
            />
          </div>

          {/* Date d'expiration */}
          <div>
            <label className="label">Date d'expiration</label>
            <input
              type="date"
              value={formData.expiry_date || ''}
              onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value || null })}
              className="input"
            />
          </div>

          {/* Options */}
          <div className="md:col-span-2 flex flex-wrap gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_prescription_required}
                onChange={(e) => setFormData({ ...formData, is_prescription_required: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">Nécessite une ordonnance</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">Produit actif</span>
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
            {isEditing ? 'Enregistrer' : 'Créer le produit'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

