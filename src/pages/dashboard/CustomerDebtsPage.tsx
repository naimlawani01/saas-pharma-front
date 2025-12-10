import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { 
  DollarSign, 
  Search, 
  User,
  CreditCard,
  Banknote,
  Smartphone,
  Check,
  Wallet,
  Plus,
  X,
  History,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import Modal from '@/components/ui/Modal';
import { Loader2 } from 'lucide-react';

interface CustomerCreditSummary {
  customer_id: number;
  customer_name: string;
  current_balance: number;
  credit_limit: number | null;
  is_over_limit: boolean;
  last_transaction_date: string | null;
  total_owed: number;
}

interface CreditTransaction {
  id: number;
  transaction_type: 'charge' | 'payment' | 'adjustment' | 'refund';
  amount: number;
  balance_after: number;
  reference_number: string | null;
  notes: string | null;
  created_at: string;
  payment_breakdowns?: PaymentBreakdown[];
}

interface PaymentBreakdown {
  payment_method: 'cash' | 'card' | 'mobile_money' | 'check' | 'bank_transfer';
  amount: number;
  reference?: string;
  notes?: string;
}

interface PayDebtForm {
  amount: number;
  payment_breakdowns: PaymentBreakdown[];
  notes?: string;
  reference_number?: string;
}

const paymentMethods = [
  { id: 'cash', name: 'Espèces', icon: Banknote },
  { id: 'card', name: 'Carte', icon: CreditCard },
  { id: 'mobile_money', name: 'Mobile Money', icon: Smartphone },
  { id: 'check', name: 'Chèque', icon: Check },
  { id: 'bank_transfer', name: 'Virement', icon: Wallet },
];

export default function CustomerDebtsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  
  // État pour le formulaire de paiement
  const [payForm, setPayForm] = useState<PayDebtForm>({
    amount: 0,
    payment_breakdowns: [],
    notes: '',
    reference_number: '',
  });

  // Récupérer le résumé des crédits
  const { data: summary, isLoading } = useQuery({
    queryKey: ['credits-summary'],
    queryFn: async () => {
      const response = await api.get('/credits/summary');
      return response.data;
    },
  });

  // Récupérer l'historique d'un client
  const { data: transactions } = useQuery({
    queryKey: ['credit-transactions', selectedCustomerId],
    queryFn: async () => {
      if (!selectedCustomerId) return [];
      const response = await api.get(`/credits/transactions?customer_id=${selectedCustomerId}`);
      return response.data as CreditTransaction[];
    },
    enabled: !!selectedCustomerId,
  });

  // Récupérer le résumé d'un client spécifique
  const { data: customerSummary } = useQuery({
    queryKey: ['customer-credit-summary', selectedCustomerId],
    queryFn: async () => {
      if (!selectedCustomerId) return null;
      const response = await api.get(`/credits/customers/${selectedCustomerId}/summary`);
      return response.data as CustomerCreditSummary;
    },
    enabled: !!selectedCustomerId,
  });

  // Mutation pour payer une dette
  const payDebtMutation = useMutation({
    mutationFn: async (data: PayDebtForm) => {
      if (!selectedCustomerId) throw new Error('Client non sélectionné');
      return api.post(`/credits/customers/${selectedCustomerId}/pay-debt`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credits-summary'] });
      queryClient.invalidateQueries({ queryKey: ['credit-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['customer-credit-summary'] });
      queryClient.invalidateQueries({ queryKey: ['current-cash-session'] });
      toast.success('Paiement enregistré avec succès');
      setShowPayModal(false);
      setPayForm({
        amount: 0,
        payment_breakdowns: [],
        notes: '',
        reference_number: '',
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Erreur lors du paiement');
    },
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-GN').format(value) + ' GNF';
  };

  const handleOpenPayModal = (customer: CustomerCreditSummary) => {
    setSelectedCustomerId(customer.customer_id);
    setPayForm({
      amount: customer.current_balance,
      payment_breakdowns: [{
        payment_method: 'cash',
        amount: customer.current_balance,
        reference: '',
        notes: '',
      }],
      notes: '',
      reference_number: '',
    });
    setShowPayModal(true);
  };

  const handleOpenHistoryModal = (customer: CustomerCreditSummary) => {
    setSelectedCustomerId(customer.customer_id);
    setShowHistoryModal(true);
  };

  const addPayment = () => {
    setPayForm({
      ...payForm,
      payment_breakdowns: [...payForm.payment_breakdowns, {
        payment_method: 'cash',
        amount: 0,
        reference: '',
        notes: '',
      }],
    });
  };

  const updatePayment = (index: number, field: keyof PaymentBreakdown, value: any) => {
    const updated = [...payForm.payment_breakdowns];
    updated[index] = { ...updated[index], [field]: value };
    
    // Recalculer le total
    const total = updated.reduce((sum, p) => sum + p.amount, 0);
    
    setPayForm({
      ...payForm,
      payment_breakdowns: updated,
      amount: total,
    });
  };

  const removePayment = (index: number) => {
    const updated = payForm.payment_breakdowns.filter((_, i) => i !== index);
    const total = updated.reduce((sum, p) => sum + p.amount, 0);
    setPayForm({
      ...payForm,
      payment_breakdowns: updated,
      amount: total,
    });
  };

  const handlePayDebt = () => {
    if (payForm.payment_breakdowns.length === 0) {
      toast.error('Ajoutez au moins un paiement');
      return;
    }

    const totalPayments = payForm.payment_breakdowns.reduce((sum, p) => sum + p.amount, 0);
    if (Math.abs(totalPayments - payForm.amount) > 0.01) {
      toast.error('La somme des paiements doit correspondre au montant total');
      return;
    }

    if (payForm.amount <= 0) {
      toast.error('Le montant doit être supérieur à 0');
      return;
    }

    if (customerSummary && payForm.amount > customerSummary.current_balance) {
      toast.error(`Le montant à payer (${formatCurrency(payForm.amount)}) dépasse la dette (${formatCurrency(customerSummary.current_balance)})`);
      return;
    }

    payDebtMutation.mutate(payForm);
  };

  const filteredCustomers = summary?.customers?.filter((customer: CustomerCreditSummary) =>
    customer.customer_name.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 flex items-center gap-2">
            <DollarSign className="w-7 h-7 text-primary-600" />
            Gestion des dettes clients
          </h1>
          <p className="text-gray-500">Suivez et encaissez les créances clients</p>
        </div>
      </div>

      {/* Statistiques */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-700 font-medium">Créances totales</p>
                <p className="text-2xl font-bold text-red-900 mt-1">
                  {formatCurrency(summary.total_credit_balance)}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-200 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-red-700" />
              </div>
            </div>
          </div>

          <div className="card bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-700 font-medium">Clients débiteurs</p>
                <p className="text-2xl font-bold text-orange-900 mt-1">
                  {summary.total_customers_with_debt}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-200 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-orange-700" />
              </div>
            </div>
          </div>

          <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700 font-medium">Plafond total</p>
                <p className="text-2xl font-bold text-blue-900 mt-1">
                  {summary.total_credit_limit ? formatCurrency(summary.total_credit_limit) : 'Illimité'}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-200 rounded-full flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-blue-700" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recherche */}
      <div className="card">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un client..."
            className="input pl-10"
          />
        </div>
      </div>

      {/* Liste des clients avec dettes */}
      <div className="card overflow-hidden p-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : filteredCustomers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr className="text-left text-sm">
                  <th className="px-6 py-4 font-semibold text-gray-700">Client</th>
                  <th className="px-6 py-4 font-semibold text-gray-700">Dette</th>
                  <th className="px-6 py-4 font-semibold text-gray-700">Plafond</th>
                  <th className="px-6 py-4 font-semibold text-gray-700">Dernière transaction</th>
                  <th className="px-6 py-4 font-semibold text-gray-700 w-48">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCustomers.map((customer: CustomerCreditSummary) => (
                  <tr key={customer.customer_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-primary-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{customer.customer_name}</p>
                          {customer.is_over_limit && (
                            <span className="text-xs text-red-600 font-medium flex items-center gap-1 mt-1">
                              <AlertCircle className="w-3 h-3" />
                              Plafond dépassé
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={clsx(
                        'font-semibold',
                        customer.current_balance > 0 ? 'text-red-600' : 'text-gray-400'
                      )}>
                        {formatCurrency(customer.current_balance)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-600 text-sm">
                        {customer.credit_limit ? formatCurrency(customer.credit_limit) : 'Illimité'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-600 text-sm">
                        {customer.last_transaction_date
                          ? new Date(customer.last_transaction_date).toLocaleDateString('fr-FR')
                          : '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenPayModal(customer)}
                          className="btn-primary text-sm py-2 px-4 flex items-center gap-2"
                        >
                          <DollarSign className="w-4 h-4" />
                          Payer
                        </button>
                        <button
                          onClick={() => handleOpenHistoryModal(customer)}
                          className="btn-secondary text-sm py-2 px-4 flex items-center gap-2"
                        >
                          <History className="w-4 h-4" />
                          Historique
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
              <DollarSign className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-lg font-medium text-gray-700 mb-2">Aucune dette enregistrée</p>
            <p className="text-sm text-gray-500">Tous les clients sont à jour dans leurs paiements</p>
          </div>
        )}
      </div>

      {/* Modal de paiement */}
      <PayDebtModal
        isOpen={showPayModal}
        onClose={() => {
          setShowPayModal(false);
          setSelectedCustomerId(null);
        }}
        customer={customerSummary}
        payForm={payForm}
        setPayForm={setPayForm}
        onPay={handlePayDebt}
        isLoading={payDebtMutation.isPending}
        addPayment={addPayment}
        updatePayment={updatePayment}
        removePayment={removePayment}
        formatCurrency={formatCurrency}
      />

      {/* Modal d'historique */}
      <HistoryModal
        isOpen={showHistoryModal}
        onClose={() => {
          setShowHistoryModal(false);
          setSelectedCustomerId(null);
        }}
        customer={customerSummary}
        transactions={transactions || []}
        formatCurrency={formatCurrency}
      />
    </div>
  );
}

// Modal pour payer une dette
function PayDebtModal({
  isOpen,
  onClose,
  customer,
  payForm,
  setPayForm,
  onPay,
  isLoading,
  addPayment,
  updatePayment,
  removePayment,
  formatCurrency,
}: {
  isOpen: boolean;
  onClose: () => void;
  customer: CustomerCreditSummary | null | undefined;
  payForm: PayDebtForm;
  setPayForm: (form: PayDebtForm) => void;
  onPay: () => void;
  isLoading: boolean;
  addPayment: () => void;
  updatePayment: (index: number, field: keyof PaymentBreakdown, value: any) => void;
  removePayment: (index: number) => void;
  formatCurrency: (value: number) => string;
}) {
  if (!customer) return null;

  const totalPayments = payForm.payment_breakdowns.reduce((sum, p) => sum + p.amount, 0);
  const remaining = customer.current_balance - totalPayments;
  const isValid = Math.abs(remaining) < 0.01;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Payer la dette - ${customer.customer_name}`}
      size="lg"
    >
      <div className="space-y-4">
        {/* Informations client */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600">Dette actuelle</p>
              <p className="text-2xl font-bold text-red-600 mt-1">
                {formatCurrency(customer.current_balance)}
              </p>
            </div>
            {customer.credit_limit && (
              <div className="text-right">
                <p className="text-sm text-gray-600">Plafond</p>
                <p className="text-lg font-semibold text-gray-900 mt-1">
                  {formatCurrency(customer.credit_limit)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Montant à payer */}
        <div>
          <label className="label">Montant à payer</label>
          <input
            type="number"
            value={payForm.amount || ''}
            onChange={(e) => {
              const amount = parseFloat(e.target.value) || 0;
              setPayForm({ ...payForm, amount });
              // Ajuster le premier paiement si un seul
              if (payForm.payment_breakdowns.length === 1) {
                updatePayment(0, 'amount', amount);
              }
            }}
            className="input"
            placeholder="0"
            min="0"
            max={customer.current_balance}
            step="0.01"
          />
          <p className="text-xs text-gray-500 mt-1">
            Maximum: {formatCurrency(customer.current_balance)}
          </p>
        </div>

        {/* Paiements multiples */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="label mb-0">Paiements</label>
            <button
              onClick={addPayment}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Ajouter
            </button>
          </div>

          <div className="space-y-3">
            {payForm.payment_breakdowns.map((payment, index) => (
              <div key={index} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Paiement {index + 1}</span>
                  {payForm.payment_breakdowns.length > 1 && (
                    <button
                      onClick={() => removePayment(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={payment.payment_method}
                    onChange={(e) => updatePayment(index, 'payment_method', e.target.value)}
                    className="input text-sm"
                  >
                    {paymentMethods.map(method => (
                      <option key={method.id} value={method.id}>{method.name}</option>
                    ))}
                  </select>

                  <input
                    type="number"
                    value={payment.amount || ''}
                    onChange={(e) => {
                      const amount = parseFloat(e.target.value) || 0;
                      updatePayment(index, 'amount', amount);
                    }}
                    placeholder="Montant"
                    className="input text-sm"
                    min="0"
                    step="0.01"
                  />
                </div>

                {(payment.payment_method === 'mobile_money' || payment.payment_method === 'check' || payment.payment_method === 'bank_transfer') && (
                  <input
                    type="text"
                    value={payment.reference || ''}
                    onChange={(e) => updatePayment(index, 'reference', e.target.value)}
                    placeholder="Référence"
                    className="input text-sm"
                  />
                )}
              </div>
            ))}
          </div>

          {/* Résumé */}
          <div className="bg-gray-50 rounded-lg p-3 mt-3 space-y-1 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Total payé:</span>
              <span className="font-medium">{formatCurrency(totalPayments)}</span>
            </div>
            <div className="flex justify-between text-gray-900 font-semibold pt-2 border-t">
              <span>Reste:</span>
              <span className={clsx(
                remaining > 0.01 ? 'text-red-600' : 'text-green-600'
              )}>
                {formatCurrency(Math.max(0, remaining))}
              </span>
            </div>
            {isValid && (
              <p className="text-green-600 text-xs font-medium mt-2">✓ Paiement complet</p>
            )}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="label">Notes (optionnel)</label>
          <textarea
            value={payForm.notes || ''}
            onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
            className="input min-h-[80px]"
            placeholder="Notes sur ce paiement..."
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            onClick={onClose}
            className="btn-secondary"
            disabled={isLoading}
          >
            Annuler
          </button>
          <button
            onClick={onPay}
            disabled={isLoading || !isValid || payForm.amount <= 0}
            className="btn-primary flex items-center gap-2"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            Enregistrer le paiement
          </button>
        </div>
      </div>
    </Modal>
  );
}

// Modal pour l'historique
function HistoryModal({
  isOpen,
  onClose,
  customer,
  transactions,
  formatCurrency,
}: {
  isOpen: boolean;
  onClose: () => void;
  customer: CustomerCreditSummary | null | undefined;
  transactions: CreditTransaction[];
  formatCurrency: (value: number) => string;
}) {
  if (!customer) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Historique - ${customer.customer_name}`}
      size="lg"
    >
      <div className="space-y-4">
        {/* Résumé */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600">Solde actuel</p>
              <p className={clsx(
                'text-2xl font-bold mt-1',
                customer.current_balance > 0 ? 'text-red-600' : 'text-green-600'
              )}>
                {formatCurrency(customer.current_balance)}
              </p>
            </div>
          </div>
        </div>

        {/* Historique */}
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">Transactions</h3>
          {transactions.length > 0 ? (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="border rounded-lg p-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={clsx(
                        'badge text-xs',
                        transaction.transaction_type === 'charge' ? 'badge-danger' :
                        transaction.transaction_type === 'payment' ? 'badge-success' :
                        'badge-warning'
                      )}>
                        {transaction.transaction_type === 'charge' ? 'Dette' :
                         transaction.transaction_type === 'payment' ? 'Paiement' :
                         transaction.transaction_type === 'adjustment' ? 'Ajustement' : 'Remboursement'}
                      </span>
                      <span className="text-sm text-gray-600">
                        {new Date(transaction.created_at).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <span className={clsx(
                      'font-semibold',
                      transaction.transaction_type === 'charge' ? 'text-red-600' : 'text-green-600'
                    )}>
                      {transaction.transaction_type === 'charge' ? '+' : '-'}
                      {formatCurrency(Math.abs(transaction.amount))}
                    </span>
                  </div>
                  
                  {transaction.payment_breakdowns && transaction.payment_breakdowns.length > 0 && (
                    <div className="mt-2 pt-2 border-t text-xs text-gray-600">
                      <p className="font-medium mb-1">Détails du paiement:</p>
                      {transaction.payment_breakdowns.map((p, idx) => (
                        <p key={idx} className="ml-2">
                          {paymentMethods.find(m => m.id === p.payment_method)?.name}: {formatCurrency(p.amount)}
                          {p.reference && ` (Ref: ${p.reference})`}
                        </p>
                      ))}
                    </div>
                  )}
                  
                  {transaction.notes && (
                    <p className="text-xs text-gray-500 mt-1">{transaction.notes}</p>
                  )}
                  
                  <div className="mt-2 text-xs text-gray-500">
                    Solde après: {formatCurrency(transaction.balance_after)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">Aucune transaction</p>
          )}
        </div>
      </div>
    </Modal>
  );
}

