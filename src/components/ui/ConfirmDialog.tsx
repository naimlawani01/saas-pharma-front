import { AlertTriangle, Trash2, Info } from 'lucide-react';
import Modal from './Modal';
import clsx from 'clsx';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  type = 'danger',
  isLoading = false,
}: ConfirmDialogProps) {
  const iconMap = {
    danger: Trash2,
    warning: AlertTriangle,
    info: Info,
  };

  const colorMap = {
    danger: {
      bg: 'bg-red-100',
      icon: 'text-red-600',
      button: 'btn-danger',
    },
    warning: {
      bg: 'bg-yellow-100',
      icon: 'text-yellow-600',
      button: 'bg-yellow-600 text-white hover:bg-yellow-700',
    },
    info: {
      bg: 'bg-blue-100',
      icon: 'text-blue-600',
      button: 'btn-primary',
    },
  };

  const Icon = iconMap[type];
  const colors = colorMap[type];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="flex flex-col items-center text-center py-4">
        <div className={clsx('w-16 h-16 rounded-full flex items-center justify-center mb-4', colors.bg)}>
          <Icon className={clsx('w-8 h-8', colors.icon)} />
        </div>
        <p className="text-gray-600">{message}</p>
      </div>
      
      <div className="flex items-center justify-end gap-3 mt-4">
        <button
          onClick={onClose}
          disabled={isLoading}
          className="btn-secondary"
        >
          {cancelText}
        </button>
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className={clsx('btn', colors.button)}
        >
          {isLoading ? 'Chargement...' : confirmText}
        </button>
      </div>
    </Modal>
  );
}

