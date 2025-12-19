import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { 
  Plus, 
  Search,
  RefreshCw,
  Users,
  Shield,
  UserCheck,
  UserX,
  Edit,
  Trash2,
  Key,
  AlertCircle,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Pagination, { usePagination } from '@/components/ui/Pagination';
import { Loader2 } from 'lucide-react';
import { parseErrors, scrollToTop } from '@/utils/errorHandler';

interface User {
  id: number;
  email: string;
  username: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
  is_superuser: boolean;
  pharmacy_id: number | null;
  created_at: string;
  last_login: string | null;
}

const roles = [
  { value: 'admin', label: 'Administrateur', color: 'bg-red-100 text-red-800' },
  { value: 'pharmacist', label: 'Pharmacien', color: 'bg-blue-100 text-blue-800' },
  { value: 'assistant', label: 'Assistant', color: 'bg-green-100 text-green-800' },
];

export default function UsersPage() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();
  const [search, setSearch] = useState('');
  
  // Modal states
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);

  // Vérifier si l'utilisateur est admin
  const isAdmin = currentUser?.role === 'admin' || currentUser?.is_superuser;

  // Récupérer les utilisateurs
  const { data: users, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await api.get('/users');
      return response.data as User[];
    },
    enabled: isAdmin,
  });

  // Mutation pour supprimer
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return api.delete(`/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Utilisateur supprimé');
      setShowDeleteDialog(false);
      setUserToDelete(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Erreur lors de la suppression');
    },
  });

  // Mutation pour activer/désactiver
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: number; is_active: boolean }) => {
      return api.put(`/users/${id}`, { is_active });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Statut mis à jour');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Erreur');
    },
  });

  const handleRefresh = () => {
    refetch();
    toast.success('Liste actualisée');
  };

  const handleAdd = () => {
    setSelectedUser(null);
    setShowFormModal(true);
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setShowFormModal(true);
  };

  const handleDelete = (user: User) => {
    if (user.id === currentUser?.id) {
      toast.error('Vous ne pouvez pas supprimer votre propre compte');
      return;
    }
    setUserToDelete(user);
    setShowDeleteDialog(true);
  };

  const handleResetPassword = (user: User) => {
    setSelectedUser(user);
    setShowResetPasswordModal(true);
  };

  const getRoleBadge = (role: string) => {
    const r = roles.find(r => r.value === role);
    return r?.color || 'bg-gray-100 text-gray-800';
  };

  const getRoleLabel = (role: string) => {
    const r = roles.find(r => r.value === role);
    return r?.label || role;
  };

  const filteredUsers = users?.filter(user =>
    user.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    user.email.toLowerCase().includes(search.toLowerCase()) ||
    user.username.toLowerCase().includes(search.toLowerCase())
  ) || [];

  // Pagination
  const {
    paginatedItems: paginatedUsers,
    currentPage,
    pageSize,
    totalPages,
    totalItems,
    handlePageChange,
    handlePageSizeChange,
  } = usePagination(filteredUsers, 20);

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <Shield className="w-16 h-16 mb-4 text-gray-300" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Accès restreint</h2>
        <p>Seuls les administrateurs peuvent accéder à cette page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Utilisateurs</h1>
          <p className="text-gray-500">{totalItems} utilisateur(s)</p>
        </div>
        <button onClick={handleAdd} className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Nouvel utilisateur
        </button>
      </div>

      {/* Search */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par nom, email..."
              className="input pl-10"
            />
          </div>
          <button
            onClick={handleRefresh}
            disabled={isFetching}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw className={clsx('w-5 h-5', isFetching && 'animate-spin')} />
            Actualiser
          </button>
        </div>
      </div>

      {/* Users table */}
      <div className="card overflow-hidden p-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : filteredUsers && filteredUsers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr className="text-left text-sm text-gray-500">
                  <th className="px-6 py-4 font-medium">Utilisateur</th>
                  <th className="px-6 py-4 font-medium">Rôle</th>
                  <th className="px-6 py-4 font-medium">Statut</th>
                  <th className="px-6 py-4 font-medium">Dernière connexion</th>
                  <th className="px-6 py-4 font-medium w-32">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                          <span className="font-semibold text-primary-700">
                            {user.full_name?.[0] || user.username[0].toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {user.full_name || user.username}
                            {user.id === currentUser?.id && (
                              <span className="ml-2 text-xs text-gray-500">(vous)</span>
                            )}
                          </p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={clsx('badge', getRoleBadge(user.role))}>
                        {getRoleLabel(user.role)}
                      </span>
                      {user.is_superuser && (
                        <span className="ml-2 badge bg-purple-100 text-purple-800">
                          Super Admin
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleActiveMutation.mutate({ id: user.id, is_active: !user.is_active })}
                        disabled={user.id === currentUser?.id}
                        className={clsx(
                          'badge flex items-center gap-1 cursor-pointer hover:opacity-80',
                          user.is_active ? 'badge-success' : 'badge-danger'
                        )}
                      >
                        {user.is_active ? (
                          <>
                            <UserCheck className="w-3 h-3" />
                            Actif
                          </>
                        ) : (
                          <>
                            <UserX className="w-3 h-3" />
                            Inactif
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {user.last_login 
                        ? new Date(user.last_login).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Jamais'
                      }
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => handleEdit(user)}
                          className="p-2 hover:bg-gray-100 rounded-lg"
                          title="Modifier"
                        >
                          <Edit className="w-4 h-4 text-gray-500" />
                        </button>
                        <button 
                          onClick={() => handleResetPassword(user)}
                          className="p-2 hover:bg-gray-100 rounded-lg"
                          title="Réinitialiser mot de passe"
                        >
                          <Key className="w-4 h-4 text-gray-500" />
                        </button>
                        {user.id !== currentUser?.id && (
                          <button 
                            onClick={() => handleDelete(user)}
                            className="p-2 hover:bg-red-50 rounded-lg"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* Pagination */}
            {totalItems > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                pageSize={pageSize}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
              />
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <Users className="w-12 h-12 mb-4 text-gray-300" />
            <p>Aucun utilisateur trouvé</p>
          </div>
        )}
      </div>

      {/* User Form Modal */}
      <UserFormModal
        isOpen={showFormModal}
        onClose={() => {
          setShowFormModal(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
      />

      {/* Reset Password Modal */}
      <ResetPasswordModal
        isOpen={showResetPasswordModal}
        onClose={() => {
          setShowResetPasswordModal(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
      />

      {/* Delete Dialog */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false);
          setUserToDelete(null);
        }}
        onConfirm={() => userToDelete && deleteMutation.mutate(userToDelete.id)}
        title="Supprimer l'utilisateur"
        message={`Êtes-vous sûr de vouloir supprimer "${userToDelete?.full_name || userToDelete?.username}" ?`}
        confirmText="Supprimer"
        type="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}

// User Form Modal Component
function UserFormModal({ isOpen, onClose, user }: { isOpen: boolean; onClose: () => void; user: User | null }) {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();
  const isEditing = !!user;

  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    full_name: '',
    role: 'assistant',
    is_active: true,
    pharmacy_id: currentUser?.pharmacy_id,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && user) {
      setFormData({
        email: user.email,
        username: user.username,
        password: '',
        full_name: user.full_name || '',
        role: user.role,
        is_active: user.is_active,
        pharmacy_id: user.pharmacy_id,
      });
    } else if (isOpen) {
      setFormData({
        email: '',
        username: '',
        password: '',
        full_name: '',
        role: 'assistant',
        is_active: true,
        pharmacy_id: currentUser?.pharmacy_id,
      });
    }
    // Réinitialiser les erreurs quand on ouvre/ferme le modal
    setErrors({});
    setGeneralError(null);
  }, [isOpen, user, currentUser?.pharmacy_id]);

  const createMutation = useMutation({
    mutationFn: async () => {
      return api.post('/auth/register', formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Utilisateur créé avec succès');
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
    mutationFn: async () => {
      const { password, ...dataWithoutPassword } = formData;
      return api.put(`/users/${user?.id}`, dataWithoutPassword);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Utilisateur modifié');
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
    
    if (!formData.email.trim()) {
      clientErrors.email = 'L\'email est requis';
    }
    if (!formData.username.trim()) {
      clientErrors.username = 'Le nom d\'utilisateur est requis';
    }
    if (!isEditing && !formData.password.trim()) {
      clientErrors.password = 'Le mot de passe est requis pour un nouvel utilisateur';
    }
    
    // Si erreurs de validation, les afficher et arrêter
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      scrollToTop();
      return;
    }

    if (isEditing) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'} size="md">
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

        <div>
          <label className="label">Nom complet</label>
          <input
            type="text"
            value={formData.full_name}
            onChange={(e) => {
              setFormData({ ...formData, full_name: e.target.value });
              if (errors.full_name) setErrors({ ...errors, full_name: '' });
            }}
            className={`input ${errors.full_name ? 'border-red-500 focus:ring-red-500' : ''}`}
            placeholder="Jean Dupont"
          />
          {errors.full_name && (
            <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              {errors.full_name}
            </p>
          )}
        </div>

        <div>
          <label className="label">Email *</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => {
              setFormData({ ...formData, email: e.target.value });
              if (errors.email) setErrors({ ...errors, email: '' });
            }}
            className={`input ${errors.email ? 'border-red-500 focus:ring-red-500' : ''}`}
            placeholder="email@exemple.com"
            required
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              {errors.email}
            </p>
          )}
        </div>

        <div>
          <label className="label">Nom d'utilisateur *</label>
          <input
            type="text"
            value={formData.username}
            onChange={(e) => {
              setFormData({ ...formData, username: e.target.value });
              if (errors.username) setErrors({ ...errors, username: '' });
            }}
            className={`input ${errors.username ? 'border-red-500 focus:ring-red-500' : ''}`}
            placeholder="jean.dupont"
            required
          />
          {errors.username && (
            <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              {errors.username}
            </p>
          )}
        </div>

        {!isEditing && (
          <div>
            <label className="label">Mot de passe *</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => {
                setFormData({ ...formData, password: e.target.value });
                if (errors.password) setErrors({ ...errors, password: '' });
              }}
              className={`input ${errors.password ? 'border-red-500 focus:ring-red-500' : ''}`}
              placeholder="••••••••"
              required={!isEditing}
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.password}
              </p>
            )}
          </div>
        )}

        <div>
          <label className="label">Rôle</label>
          <select
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            className="input"
          >
            {roles.map(role => (
              <option key={role.value} value={role.value}>{role.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">Compte actif</span>
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <button type="button" onClick={onClose} disabled={isLoading} className="btn-secondary">
            Annuler
          </button>
          <button type="submit" disabled={isLoading} className="btn-primary flex items-center gap-2">
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isEditing ? 'Enregistrer' : 'Créer'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// Reset Password Modal Component
function ResetPasswordModal({ isOpen, onClose, user }: { isOpen: boolean; onClose: () => void; user: User | null }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const resetMutation = useMutation({
    mutationFn: async () => {
      return api.put(`/users/${user?.id}/reset-password`, { new_password: newPassword });
    },
    onSuccess: () => {
      toast.success('Mot de passe réinitialisé');
      setNewPassword('');
      setConfirmPassword('');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Erreur');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    resetMutation.mutate();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Réinitialiser le mot de passe" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-gray-600">
          Réinitialiser le mot de passe de <strong>{user?.full_name || user?.username}</strong>
        </p>

        <div>
          <label className="label">Nouveau mot de passe</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="input"
            placeholder="••••••••"
            required
          />
        </div>

        <div>
          <label className="label">Confirmer le mot de passe</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="input"
            placeholder="••••••••"
            required
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <button type="button" onClick={onClose} className="btn-secondary">
            Annuler
          </button>
          <button 
            type="submit" 
            disabled={resetMutation.isPending} 
            className="btn-primary flex items-center gap-2"
          >
            {resetMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Réinitialiser
          </button>
        </div>
      </form>
    </Modal>
  );
}

