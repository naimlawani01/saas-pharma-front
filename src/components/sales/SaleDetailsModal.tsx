import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import ReceiptModal from './ReceiptModal';
import toast from 'react-hot-toast';
import { 
  Printer, 
  XCircle, 
  RefreshCcw,
  Package,
  Calendar,
  CreditCard,
  User,
} from 'lucide-react';
import clsx from 'clsx';

interface SaleItem {
  id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  discount: number;
  total: number;
  product?: {
    id: number;
    name: string;
    barcode?: string;
  };
}

interface Sale {
  id: number;
  sale_number: string;
  customer_id: number | null;
  user_id: number;
  total_amount: number;
  discount: number;
  tax: number;
  final_amount: number;
  payment_method: string;
  status: string;
  notes: string | null;
  created_at: string;
  items: SaleItem[];
}

interface SaleDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
}

export default function SaleDetailsModal({ isOpen, onClose, sale }: SaleDetailsModalProps) {
  const queryClient = useQueryClient();
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showRefundDialog, setShowRefundDialog] = useState(false);

  // Mutation pour annuler
  const cancelMutation = useMutation({
    mutationFn: async () => {
      return api.put(`/sales/${sale?.id}`, { status: 'cancelled' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Vente annulée avec succès');
      setShowCancelDialog(false);
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'annulation');
    },
  });

  // Mutation pour rembourser
  const refundMutation = useMutation({
    mutationFn: async () => {
      return api.put(`/sales/${sale?.id}`, { status: 'refunded' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Vente remboursée avec succès');
      setShowRefundDialog(false);
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Erreur lors du remboursement');
    },
  });

  if (!sale) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-GN').format(value) + ' GNF';
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      completed: 'badge-success',
      pending: 'badge-warning',
      cancelled: 'badge-danger',
      refunded: 'bg-purple-100 text-purple-800',
    };
    return styles[status] || 'badge-info';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      completed: 'Complétée',
      pending: 'En attente',
      cancelled: 'Annulée',
      refunded: 'Remboursée',
    };
    return labels[status] || status;
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      cash: 'Espèces',
      card: 'Carte bancaire',
      mobile_money: 'Mobile Money',
      credit: 'Crédit',
    };
    return labels[method] || method;
  };

  const canCancel = sale.status === 'completed' || sale.status === 'pending';
  const canRefund = sale.status === 'completed';

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Détails de la vente" size="lg">
        {/* Header info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">N° Vente</p>
            <p className="font-semibold text-gray-900">{sale.sale_number}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Date</p>
            <p className="font-semibold text-gray-900">{formatDate(sale.created_at)}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Paiement</p>
            <p className="font-semibold text-gray-900">{getPaymentMethodLabel(sale.payment_method)}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Statut</p>
            <span className={clsx('badge', getStatusBadge(sale.status))}>
              {getStatusLabel(sale.status)}
            </span>
          </div>
        </div>

        {/* Items */}
        <div className="mb-6">
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Package className="w-5 h-5" />
            Articles ({sale.items.length})
          </h4>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr className="text-left text-sm text-gray-500">
                  <th className="px-4 py-3 font-medium">Produit</th>
                  <th className="px-4 py-3 font-medium text-center">Qté</th>
                  <th className="px-4 py-3 font-medium text-right">Prix unit.</th>
                  <th className="px-4 py-3 font-medium text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sale.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">
                        {item.product?.name || `Produit #${item.product_id}`}
                      </p>
                      {item.product?.barcode && (
                        <p className="text-xs text-gray-500">{item.product.barcode}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">{item.quantity}</td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {formatCurrency(item.unit_price)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatCurrency(item.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals */}
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Sous-total:</span>
              <span>{formatCurrency(sale.total_amount)}</span>
            </div>
            {sale.discount > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Remise:</span>
                <span>-{formatCurrency(sale.discount)}</span>
              </div>
            )}
            {sale.tax > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Taxe:</span>
                <span>{formatCurrency(sale.tax)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-300">
              <span>Total:</span>
              <span className="text-primary-600">{formatCurrency(sale.final_amount)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {sale.notes && (
          <div className="mb-6 p-4 bg-yellow-50 rounded-lg">
            <p className="text-sm font-medium text-yellow-800 mb-1">Notes:</p>
            <p className="text-sm text-yellow-700">{sale.notes}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t">
          <div className="flex gap-2">
            {canCancel && (
              <button 
                onClick={() => setShowCancelDialog(true)}
                className="btn-danger flex items-center gap-2"
              >
                <XCircle className="w-4 h-4" />
                Annuler
              </button>
            )}
            {canRefund && (
              <button 
                onClick={() => setShowRefundDialog(true)}
                className="btn flex items-center gap-2 bg-purple-600 text-white hover:bg-purple-700"
              >
                <RefreshCcw className="w-4 h-4" />
                Rembourser
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-secondary">
              Fermer
            </button>
            <button 
              onClick={() => setShowReceiptModal(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Imprimer ticket
            </button>
          </div>
        </div>
      </Modal>

      {/* Receipt Modal */}
      <ReceiptModal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        sale={sale}
      />

      {/* Cancel Dialog */}
      <ConfirmDialog
        isOpen={showCancelDialog}
        onClose={() => setShowCancelDialog(false)}
        onConfirm={() => cancelMutation.mutate()}
        title="Annuler la vente"
        message="Êtes-vous sûr de vouloir annuler cette vente ? Le stock sera restauré."
        confirmText="Annuler la vente"
        type="danger"
        isLoading={cancelMutation.isPending}
      />

      {/* Refund Dialog */}
      <ConfirmDialog
        isOpen={showRefundDialog}
        onClose={() => setShowRefundDialog(false)}
        onConfirm={() => refundMutation.mutate()}
        title="Rembourser la vente"
        message={`Confirmez le remboursement de ${formatCurrency(sale.final_amount)} ? Le stock sera restauré.`}
        confirmText="Rembourser"
        type="warning"
        isLoading={refundMutation.isPending}
      />
    </>
  );
}

