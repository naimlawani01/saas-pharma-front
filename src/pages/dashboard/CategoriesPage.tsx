import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { 
  Tag, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  RefreshCw,
  Package,
  AlertCircle,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { Loader2 } from 'lucide-react';
import { parseErrors, scrollToTop } from '@/utils/errorHandler';

interface Category {
  id: number;
  name: string;
  description: string | null;
  pharmacy_id: number;
  created_at: string;
  updated_at: string;
}

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formGeneralError, setFormGeneralError] = useState<string | null>(null);

  // Récupérer les catégories
  const { data: categories, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['categories', search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      const response = await api.get(`/products/categories?${params}`);
      return response.data as Category[];
    },
  });

  // Créer/Mettre à jour une catégorie
  const saveMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string | null }) => {
      if (selectedCategory) {
        return api.put(`/products/categories/${selectedCategory.id}`, data);
      } else {
        return api.post('/products/categories', data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['products'] }); // Invalider aussi les produits
      toast.success(selectedCategory ? 'Catégorie modifiée' : 'Catégorie créée');
      setFormErrors({});
      setFormGeneralError(null);
      setShowFormModal(false);
      setSelectedCategory(null);
    },
    onError: (error: any) => {
      const { fieldErrors, generalError } = parseErrors(error);
      setFormErrors(fieldErrors);
      setFormGeneralError(generalError);
      scrollToTop();
    },
  });

  // Supprimer une catégorie
  const deleteMutation = useMutation({
    mutationFn: async (categoryId: number) => {
      return api.delete(`/products/categories/${categoryId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Catégorie supprimée');
      setShowDeleteDialog(false);
      setCategoryToDelete(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Erreur lors de la suppression');
    },
  });

  const handleAdd = () => {
    setSelectedCategory(null);
    setFormErrors({});
    setFormGeneralError(null);
    setShowFormModal(true);
  };

  const handleEdit = (category: Category) => {
    setSelectedCategory(category);
    setFormErrors({});
    setFormGeneralError(null);
    setShowFormModal(true);
  };

  const handleDelete = (category: Category) => {
    setCategoryToDelete(category);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (categoryToDelete) {
      deleteMutation.mutate(categoryToDelete.id);
    }
  };

  const filteredCategories = categories || [];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 flex items-center gap-2">
            <Tag className="w-7 h-7 text-primary-600" />
            Catégories de produits
          </h1>
          <p className="text-gray-500">Gérez les catégories de vos produits</p>
        </div>
        <button 
          onClick={handleAdd}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Nouvelle catégorie
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher une catégorie..."
              className="input pl-10"
            />
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw className={`w-5 h-5 ${isFetching ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>
      </div>

      {/* Categories List */}
      <div className="card overflow-hidden p-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : filteredCategories.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr className="text-left text-sm">
                  <th className="px-6 py-4 font-semibold text-gray-700">Nom</th>
                  <th className="px-6 py-4 font-semibold text-gray-700">Description</th>
                  <th className="px-6 py-4 font-semibold text-gray-700">Créée le</th>
                  <th className="px-6 py-4 font-semibold text-gray-700 w-32">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCategories.map((category) => (
                  <tr key={category.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                          <Tag className="w-5 h-5 text-primary-600" />
                        </div>
                        <span className="font-medium text-gray-900">{category.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-600 text-sm">
                        {category.description || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-600 text-sm">
                        {new Date(category.created_at).toLocaleDateString('fr-FR')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(category)}
                          className="p-2 hover:bg-primary-50 rounded-lg transition-colors"
                          title="Modifier"
                        >
                          <Edit2 className="w-4 h-4 text-primary-600" />
                        </button>
                        <button
                          onClick={() => handleDelete(category)}
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500 p-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Package className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-lg font-medium text-gray-700 mb-2">Aucune catégorie trouvée</p>
            <p className="text-sm text-gray-500 mb-4">Créez votre première catégorie pour organiser vos produits</p>
            <button 
              onClick={handleAdd} 
              className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 shadow-md transition-all hover:scale-105"
            >
              <Plus className="w-5 h-5" />
              Créer une catégorie
            </button>
          </div>
        )}
      </div>

      {/* Form Modal */}
      <CategoryFormModal
        isOpen={showFormModal}
        onClose={() => {
          setShowFormModal(false);
          setSelectedCategory(null);
          setFormErrors({});
          setFormGeneralError(null);
        }}
        category={selectedCategory}
        onSave={(data) => saveMutation.mutate(data)}
        isLoading={saveMutation.isPending}
        errors={formErrors}
        generalError={formGeneralError}
        onClearErrors={() => {
          setFormErrors({});
          setFormGeneralError(null);
        }}
      />

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false);
          setCategoryToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Supprimer la catégorie"
        message={`Êtes-vous sûr de vouloir supprimer la catégorie "${categoryToDelete?.name}" ? Cette action est irréversible.`}
        confirmText="Supprimer"
        type="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}

// Category Form Modal
function CategoryFormModal({
  isOpen,
  onClose,
  category,
  onSave,
  isLoading,
  errors,
  generalError,
  onClearErrors,
}: {
  isOpen: boolean;
  onClose: () => void;
  category: Category | null;
  onSave: (data: { name: string; description?: string | null }) => void;
  isLoading: boolean;
  errors?: Record<string, string>;
  generalError?: string | null;
  onClearErrors?: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  // Charger les données de la catégorie si édition
  useEffect(() => {
    if (category) {
      setName(category.name);
      setDescription(category.description || '');
    } else {
      setName('');
      setDescription('');
    }
  }, [category, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onClearErrors) onClearErrors();
    
    // Validation côté client
    const clientErrors: Record<string, string> = {};
    if (!name.trim()) {
      clientErrors.name = 'Le nom de la catégorie est requis';
    }
    
    if (Object.keys(clientErrors).length > 0) {
      // Les erreurs seront gérées par le parent
      return;
    }
    
    onSave({
      name: name.trim(),
      description: description.trim() || null,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={category ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
      size="md"
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
              onClick={onClearErrors}
              className="flex-shrink-0 p-1 hover:bg-red-100 rounded"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div>
          <label className="label">Nom de la catégorie *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors?.name && onClearErrors) {
                const newErrors = { ...errors };
                delete newErrors.name;
                onClearErrors();
              }
            }}
            className={`input ${errors?.name ? 'border-red-500 focus:ring-red-500' : ''}`}
            placeholder="Ex: Médicaments, Compléments alimentaires..."
            required
          />
          {errors?.name && (
            <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              {errors.name}
            </p>
          )}
        </div>

        <div>
          <label className="label">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input min-h-[100px]"
            placeholder="Description de la catégorie (optionnel)..."
          />
        </div>

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
            className="btn-primary flex items-center gap-2"
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {category ? 'Modifier' : 'Créer'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

