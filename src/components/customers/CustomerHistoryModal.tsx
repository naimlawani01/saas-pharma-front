import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import Modal from '@/components/ui/Modal';
import { useState } from 'react';
import { 
  ShoppingCart, 
  Calendar,
  CreditCard,
  Package,
  TrendingUp,
  FileText,
} from 'lucide-react';
import clsx from 'clsx';
import { Prescription, PrescriptionStatus } from '@/types/prescription';

interface Customer {
  id: number;
  first_name: string;
  last_name: string;
}

interface SaleItem {
  id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  discount: number;
  total: number;
  product?: {
    name: string;
  };
}

interface Sale {
  id: number;
  sale_number: string;
  total_amount: number;
  discount: number;
  final_amount: number;
  payment_method: string;
  status: string;
  created_at: string;
  items?: SaleItem[];
}

interface CustomerHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
}

export default function CustomerHistoryModal({ isOpen, onClose, customer }: CustomerHistoryModalProps) {
  const [activeTab, setActiveTab] = useState<'sales' | 'prescriptions'>('sales');

  const { data: sales, isLoading, isFetching } = useQuery({
    queryKey: ['customer-sales', customer?.id],
    queryFn: async () => {
      // Récupérer toutes les ventes du client (sans limite)
      const response = await api.get(`/sales?customer_id=${customer?.id}&limit=1000`);
      return response.data as Sale[];
    },
    enabled: isOpen && !!customer?.id,
    // Forcer le rafraîchissement à l'ouverture
    refetchOnMount: true,
  });

  // Récupérer les prescriptions du client
  const { data: prescriptions, isLoading: isLoadingPrescriptions } = useQuery({
    queryKey: ['customer-prescriptions', customer?.id],
    queryFn: async () => {
      const response = await api.get(`/prescriptions/customer/${customer?.id}`);
      return response.data as Prescription[];
    },
    enabled: isOpen && !!customer?.id && activeTab === 'prescriptions',
  });

  // Calculer les statistiques - seulement les ventes complétées
  const completedSales = sales?.filter(sale => sale.status === 'completed') || [];
  const totalSpent = completedSales.reduce((sum, sale) => sum + (sale.final_amount || 0), 0);
  const totalPurchases = completedSales.length;
  const averageBasket = totalPurchases > 0 ? totalSpent / totalPurchases : 0;
  
  // Toutes les ventes (y compris annulées, en attente, etc.)
  const allSalesCount = sales?.length || 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-GN').format(value) + ' GNF';
  };

  const paymentMethodLabels: Record<string, string> = {
    cash: 'Espèces',
    card: 'Carte',
    mobile_money: 'Mobile Money',
    credit: 'Crédit',
  };

  const statusLabels: Record<string, { label: string; class: string }> = {
    completed: { label: 'Payée', class: 'badge-success' },
    pending: { label: 'En attente', class: 'badge-warning' },
    cancelled: { label: 'Annulée', class: 'badge-danger' },
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={`Historique - ${customer?.first_name} ${customer?.last_name}`}
      size="lg"
    >
      <div className="space-y-6">
        {/* Onglets */}
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('sales')}
            className={clsx(
              'px-4 py-2 font-medium text-sm border-b-2 transition-colors',
              activeTab === 'sales'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              Achats
            </div>
          </button>
          <button
            onClick={() => setActiveTab('prescriptions')}
            className={clsx(
              'px-4 py-2 font-medium text-sm border-b-2 transition-colors',
              activeTab === 'prescriptions'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Prescriptions
            </div>
          </button>
        </div>

        {/* Statistiques */}
        {activeTab === 'sales' && (
          <>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-green-50 p-4 rounded-xl text-center">
                <TrendingUp className="w-6 h-6 text-green-600 mx-auto mb-2" />
                <p className="text-xs text-green-600 mb-1">Total dépensé</p>
                <p className="font-bold text-green-800">{formatCurrency(totalSpent)}</p>
                <p className="text-xs text-green-500 mt-1">({totalPurchases} achat{totalPurchases > 1 ? 's' : ''} payé{totalPurchases > 1 ? 's' : ''})</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-xl text-center">
                <ShoppingCart className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                <p className="text-xs text-blue-600 mb-1">Total commandes</p>
                <p className="font-bold text-blue-800">{allSalesCount}</p>
                <p className="text-xs text-blue-500 mt-1">(tous statuts)</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-xl text-center">
                <CreditCard className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                <p className="text-xs text-purple-600 mb-1">Panier moyen</p>
                <p className="font-bold text-purple-800">{formatCurrency(averageBasket)}</p>
                <p className="text-xs text-purple-500 mt-1">(ventes payées)</p>
              </div>
            </div>
            
            {isFetching && (
              <div className="flex items-center justify-center py-2 text-sm text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600 mr-2"></div>
                Actualisation des données...
              </div>
            )}

            {/* Liste des ventes */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Historique des achats</h3>
          
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : sales && sales.length > 0 ? (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              <p className="text-xs text-gray-500 mb-2">
                {sales.length} commande{sales.length > 1 ? 's' : ''} trouvée{sales.length > 1 ? 's' : ''}
                {completedSales.length !== allSalesCount && (
                  <span className="ml-2">
                    ({completedSales.length} payée{completedSales.length > 1 ? 's' : ''})
                  </span>
                )}
              </p>
              {sales.map((sale) => (
                <div key={sale.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium">{sale.sale_number}</span>
                      <span className={clsx('badge', statusLabels[sale.status]?.class || 'badge')}>
                        {statusLabels[sale.status]?.label || sale.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Calendar className="w-4 h-4" />
                      {new Date(sale.created_at).toLocaleDateString('fr-FR')}
                    </div>
                  </div>
                  
                  {/* Items */}
                  {sale.items && sale.items.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {sale.items.slice(0, 3).map((item) => (
                        <div key={item.id} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <Package className="w-3 h-3 text-gray-400" />
                            <span className="text-gray-600">
                              {item.product?.name || `Produit #${item.product_id}`}
                            </span>
                            <span className="text-gray-400">x{item.quantity}</span>
                          </div>
                          <span className="text-gray-600">{formatCurrency(item.total)}</span>
                        </div>
                      ))}
                      {sale.items.length > 3 && (
                        <p className="text-xs text-gray-400">
                          +{sale.items.length - 3} autre(s) article(s)
                        </p>
                      )}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                    <span className="text-sm text-gray-500">
                      {paymentMethodLabels[sale.payment_method] || sale.payment_method}
                    </span>
                    <span className="font-semibold text-green-600">
                      {formatCurrency(sale.final_amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <ShoppingCart className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>Aucun achat enregistré</p>
            </div>
          )}
        </div>
          </>
        )}

        {/* Liste des prescriptions */}
        {activeTab === 'prescriptions' && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Prescriptions ({prescriptions?.length || 0})
            </h3>
            
            {isLoadingPrescriptions ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            ) : prescriptions && prescriptions.length > 0 ? (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {prescriptions.map((prescription) => {
                  const STATUS_LABELS: Record<PrescriptionStatus, string> = {
                    [PrescriptionStatus.ACTIVE]: 'Active',
                    [PrescriptionStatus.USED]: 'Utilisée',
                    [PrescriptionStatus.PARTIALLY_USED]: 'Partiellement utilisée',
                    [PrescriptionStatus.EXPIRED]: 'Expirée',
                    [PrescriptionStatus.CANCELLED]: 'Annulée',
                  };

                  const STATUS_COLORS: Record<PrescriptionStatus, string> = {
                    [PrescriptionStatus.ACTIVE]: 'bg-green-100 text-green-800',
                    [PrescriptionStatus.USED]: 'bg-blue-100 text-blue-800',
                    [PrescriptionStatus.PARTIALLY_USED]: 'bg-yellow-100 text-yellow-800',
                    [PrescriptionStatus.EXPIRED]: 'bg-red-100 text-red-800',
                    [PrescriptionStatus.CANCELLED]: 'bg-gray-100 text-gray-800',
                  };

                  return (
                    <div key={prescription.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-medium">
                            {prescription.prescription_number}
                          </span>
                          <span className={clsx('badge text-xs', STATUS_COLORS[prescription.status])}>
                            {STATUS_LABELS[prescription.status]}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Calendar className="w-4 h-4" />
                          {new Date(prescription.prescription_date).toLocaleDateString('fr-FR')}
                        </div>
                      </div>
                      
                      <div className="mt-2 text-sm text-gray-600">
                        <p className="font-medium">{prescription.doctor_name}</p>
                        {prescription.doctor_specialty && (
                          <p className="text-xs text-gray-500">{prescription.doctor_specialty}</p>
                        )}
                      </div>

                      {prescription.items && prescription.items.length > 0 && (
                        <div className="mt-3 space-y-1">
                          {prescription.items.slice(0, 3).map((item) => (
                            <div key={item.id} className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <Package className="w-3 h-3 text-gray-400" />
                                <span className="text-gray-600">
                                  {item.product?.name || `Produit #${item.product_id}`}
                                </span>
                                <span className="text-gray-400">
                                  ({item.quantity_used}/{item.quantity_prescribed})
                                </span>
                              </div>
                            </div>
                          ))}
                          {prescription.items.length > 3 && (
                            <p className="text-xs text-gray-400">
                              +{prescription.items.length - 3} autre(s) produit(s)
                            </p>
                          )}
                        </div>
                      )}

                      {prescription.expiry_date && (
                        <div className="mt-2 text-xs text-gray-500">
                          Expire le {new Date(prescription.expiry_date).toLocaleDateString('fr-FR')}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>Aucune prescription enregistrée</p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t">
          <button onClick={onClose} className="btn-secondary">
            Fermer
          </button>
        </div>
      </div>
    </Modal>
  );
}


