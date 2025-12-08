import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import Modal from '@/components/ui/Modal';
import toast from 'react-hot-toast';
import { Loader2, Trash2, Search } from 'lucide-react';
import { Prescription, PrescriptionCreate } from '@/types/prescription';

interface PrescriptionItemForm {
  product_id: number;
  quantity_prescribed: number;
  dosage?: string;
  duration?: string;
  instructions?: string;
  notes?: string;
}

interface PrescriptionFormModalProps {
  prescription?: Prescription | null;
  pharmacyId: number;
  isOpen?: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PrescriptionFormModal({
  prescription,
  pharmacyId,
  isOpen = true,
  onClose,
  onSuccess,
}: PrescriptionFormModalProps) {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isEditing = !!prescription;

  const [formData, setFormData] = useState({
    customer_id: prescription?.customer_id || 0,
    doctor_name: prescription?.doctor_name || '',
    doctor_specialty: prescription?.doctor_specialty || '',
    doctor_license_number: prescription?.doctor_license_number || '',
    doctor_phone: prescription?.doctor_phone || '',
    prescription_date: prescription?.prescription_date
      ? new Date(prescription.prescription_date).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    expiry_date: prescription?.expiry_date
      ? new Date(prescription.expiry_date).toISOString().split('T')[0]
      : '',
    diagnosis: prescription?.diagnosis || '',
    notes: prescription?.notes || '',
  });

  const [items, setItems] = useState<PrescriptionItemForm[]>(
    prescription?.items.map(item => ({
      product_id: item.product_id,
      quantity_prescribed: item.quantity_prescribed,
      dosage: item.dosage || '',
      duration: item.duration || '',
      instructions: item.instructions || '',
      notes: item.notes || '',
    })) || []
  );

  const [productSearch, setProductSearch] = useState('');
  const [showProductSearch, setShowProductSearch] = useState(false);

  // Récupérer les clients
  const { data: customers } = useQuery({
    queryKey: ['customers-list'],
    queryFn: async () => {
      const response = await api.get('/customers');
      return response.data;
    },
  });

  // Rechercher les produits
  const { data: products } = useQuery({
    queryKey: ['products-search', productSearch],
    queryFn: async () => {
      if (productSearch.length < 2) return [];
      const response = await api.get(`/products?search=${productSearch}`);
      return response.data;
    },
    enabled: productSearch.length >= 2 && showProductSearch,
  });

  const addItem = (product: any) => {
    if (items.some(item => item.product_id === product.id)) {
      toast.error('Ce produit est déjà dans la prescription');
      return;
    }
    setItems([...items, {
      product_id: product.id,
      quantity_prescribed: 1,
      dosage: '',
      duration: '',
      instructions: '',
      notes: '',
    }]);
    setProductSearch('');
    setShowProductSearch(false);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof PrescriptionItemForm, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const createMutation = useMutation({
    mutationFn: async (data: PrescriptionCreate) => {
      return api.post('/prescriptions', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
      toast.success('Prescription créée avec succès');
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Erreur lors de la création');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<PrescriptionCreate>) => {
      return api.put(`/prescriptions/${prescription!.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
      toast.success('Prescription modifiée avec succès');
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Erreur lors de la modification');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customer_id) {
      toast.error('Veuillez sélectionner un client');
      return;
    }

    if (!formData.doctor_name.trim()) {
      toast.error('Le nom du médecin est requis');
      return;
    }

    if (items.length === 0) {
      toast.error('Veuillez ajouter au moins un produit');
      return;
    }

    const prescriptionData: PrescriptionCreate = {
      pharmacy_id: pharmacyId,
      customer_id: formData.customer_id,
      user_id: user?.id || null,
      doctor_name: formData.doctor_name,
      doctor_specialty: formData.doctor_specialty || null,
      doctor_license_number: formData.doctor_license_number || null,
      doctor_phone: formData.doctor_phone || null,
      prescription_date: new Date(formData.prescription_date).toISOString(),
      expiry_date: formData.expiry_date
        ? new Date(formData.expiry_date).toISOString()
        : null,
      diagnosis: formData.diagnosis || null,
      notes: formData.notes || null,
      items: items.map(item => ({
        product_id: item.product_id,
        quantity_prescribed: item.quantity_prescribed,
        dosage: item.dosage || null,
        duration: item.duration || null,
        instructions: item.instructions || null,
        notes: item.notes || null,
      })),
    };

    if (isEditing) {
      updateMutation.mutate(prescriptionData);
    } else {
      createMutation.mutate(prescriptionData);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Modifier la prescription' : 'Nouvelle prescription'}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Informations client */}
        <div>
          <label className="label">Client *</label>
          <select
            value={formData.customer_id}
            onChange={(e) => setFormData({ ...formData, customer_id: parseInt(e.target.value) })}
            className="input"
            required
            disabled={isEditing}
          >
            <option value={0}>Sélectionner un client</option>
            {customers?.map((customer: any) => (
              <option key={customer.id} value={customer.id}>
                {customer.first_name} {customer.last_name}
                {customer.phone && ` - ${customer.phone}`}
              </option>
            ))}
          </select>
        </div>

        {/* Informations médecin */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Nom du médecin *</label>
            <input
              type="text"
              value={formData.doctor_name}
              onChange={(e) => setFormData({ ...formData, doctor_name: e.target.value })}
              className="input"
              required
            />
          </div>
          <div>
            <label className="label">Spécialité</label>
            <input
              type="text"
              value={formData.doctor_specialty}
              onChange={(e) => setFormData({ ...formData, doctor_specialty: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="label">N° Licence (RPPS/ADELI)</label>
            <input
              type="text"
              value={formData.doctor_license_number}
              onChange={(e) => setFormData({ ...formData, doctor_license_number: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="label">Téléphone</label>
            <input
              type="text"
              value={formData.doctor_phone}
              onChange={(e) => setFormData({ ...formData, doctor_phone: e.target.value })}
              className="input"
            />
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Date de prescription *</label>
            <input
              type="date"
              value={formData.prescription_date}
              onChange={(e) => setFormData({ ...formData, prescription_date: e.target.value })}
              className="input"
              required
            />
          </div>
          <div>
            <label className="label">Date d'expiration</label>
            <input
              type="date"
              value={formData.expiry_date}
              onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
              className="input"
            />
          </div>
        </div>

        {/* Diagnostic */}
        <div>
          <label className="label">Diagnostic / Motif</label>
          <textarea
            value={formData.diagnosis}
            onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
            className="input"
            rows={2}
          />
        </div>

        {/* Produits prescrits */}
        <div>
          <label className="label">Produits prescrits *</label>
          
          {/* Recherche de produit */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={productSearch}
              onChange={(e) => {
                setProductSearch(e.target.value);
                setShowProductSearch(true);
              }}
              onFocus={() => setShowProductSearch(true)}
              placeholder="Rechercher un produit..."
              className="input pl-10"
            />
            {showProductSearch && products && products.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {products.map((product: any) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => addItem(product)}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-medium">{product.name}</div>
                      <div className="text-sm text-gray-500">
                        {product.barcode && `Code: ${product.barcode}`}
                      </div>
                    </div>
                    <div className="text-sm font-medium">
                      {new Intl.NumberFormat('fr-GN').format(product.selling_price)} GNF
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Liste des produits */}
          <div className="space-y-3">
            {items.map((item, index) => {
              const product = products?.find((p: any) => p.id === item.product_id);
              return (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="font-medium">
                        {product?.name || `Produit #${item.product_id}`}
                      </div>
                      {product?.barcode && (
                        <div className="text-sm text-gray-500">
                          Code: {product.barcode}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="label text-xs">Quantité prescrite *</label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity_prescribed}
                        onChange={(e) => updateItem(index, 'quantity_prescribed', parseInt(e.target.value) || 1)}
                        className="input"
                        required
                      />
                    </div>
                    <div>
                      <label className="label text-xs">Posologie</label>
                      <input
                        type="text"
                        value={item.dosage}
                        onChange={(e) => updateItem(index, 'dosage', e.target.value)}
                        className="input"
                        placeholder="Ex: 1 comprimé matin et soir"
                      />
                    </div>
                    <div>
                      <label className="label text-xs">Durée</label>
                      <input
                        type="text"
                        value={item.duration}
                        onChange={(e) => updateItem(index, 'duration', e.target.value)}
                        className="input"
                        placeholder="Ex: 7 jours"
                      />
                    </div>
                    <div>
                      <label className="label text-xs">Instructions</label>
                      <textarea
                        value={item.instructions}
                        onChange={(e) => updateItem(index, 'instructions', e.target.value)}
                        className="input"
                        rows={2}
                        placeholder="Instructions détaillées..."
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {items.length === 0 && (
            <div className="text-center py-8 text-gray-500 border border-dashed border-gray-300 rounded-lg">
              <p>Aucun produit ajouté</p>
              <p className="text-sm">Recherchez et ajoutez des produits ci-dessus</p>
            </div>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="label">Notes</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="input"
            rows={3}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
            disabled={isLoading}
          >
            Annuler
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isEditing ? 'Modification...' : 'Création...'}
              </>
            ) : (
              isEditing ? 'Modifier' : 'Créer'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

