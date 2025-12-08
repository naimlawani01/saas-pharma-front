import { useRef } from 'react';
import { Printer, X, Download } from 'lucide-react';
import Modal from '@/components/ui/Modal';

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
  };
}

interface Customer {
  id: number;
  first_name: string;
  last_name: string;
  phone?: string | null;
}

interface Sale {
  id: number;
  sale_number: string;
  total_amount: number;
  discount: number;
  tax: number;
  final_amount: number;
  payment_method: string;
  status: string;
  created_at: string;
  items: SaleItem[];
  customer?: Customer | null;
}

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  pharmacyName?: string;
  pharmacyAddress?: string;
  pharmacyPhone?: string;
}

export default function ReceiptModal({ 
  isOpen, 
  onClose, 
  sale,
  pharmacyName = "Pharmacie Centrale",
  pharmacyAddress = "Rue de la République, Conakry",
  pharmacyPhone = "+224 620 00 00 00"
}: ReceiptModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

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

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      cash: 'Espèces',
      card: 'Carte bancaire',
      mobile_money: 'Mobile Money',
      credit: 'Crédit',
    };
    return labels[method] || method;
  };

  const handlePrint = () => {
    const printContent = receiptRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Veuillez autoriser les pop-ups pour imprimer');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Ticket - ${sale.sale_number}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Courier New', monospace;
              font-size: 12px;
              width: 80mm;
              padding: 5mm;
            }
            .header {
              text-align: center;
              margin-bottom: 10px;
              padding-bottom: 10px;
              border-bottom: 1px dashed #000;
            }
            .header h1 {
              font-size: 16px;
              margin-bottom: 5px;
            }
            .header p {
              font-size: 10px;
              color: #666;
            }
            .info {
              margin-bottom: 10px;
              padding-bottom: 10px;
              border-bottom: 1px dashed #000;
            }
            .info p {
              display: flex;
              justify-content: space-between;
            }
            .items {
              margin-bottom: 10px;
              padding-bottom: 10px;
              border-bottom: 1px dashed #000;
            }
            .item {
              margin-bottom: 5px;
            }
            .item-name {
              font-weight: bold;
            }
            .item-details {
              display: flex;
              justify-content: space-between;
              padding-left: 10px;
            }
            .totals {
              margin-bottom: 10px;
            }
            .totals p {
              display: flex;
              justify-content: space-between;
            }
            .totals .grand-total {
              font-size: 14px;
              font-weight: bold;
              margin-top: 5px;
              padding-top: 5px;
              border-top: 1px solid #000;
            }
            .footer {
              text-align: center;
              margin-top: 15px;
              padding-top: 10px;
              border-top: 1px dashed #000;
              font-size: 10px;
            }
            @media print {
              body { width: 80mm; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ticket de caisse" size="sm">
      {/* Receipt Preview */}
      <div 
        ref={receiptRef}
        className="bg-white p-4 border rounded-lg font-mono text-sm"
        style={{ maxWidth: '300px', margin: '0 auto' }}
      >
        {/* Header */}
        <div className="header text-center mb-4 pb-4 border-b border-dashed border-gray-400">
          <h1 className="text-lg font-bold">{pharmacyName}</h1>
          <p className="text-xs text-gray-600">{pharmacyAddress}</p>
          <p className="text-xs text-gray-600">Tél: {pharmacyPhone}</p>
        </div>

        {/* Sale Info */}
        <div className="info mb-4 pb-4 border-b border-dashed border-gray-400">
          <div className="flex justify-between">
            <span>N°:</span>
            <span className="font-bold">{sale.sale_number}</span>
          </div>
          <div className="flex justify-between">
            <span>Date:</span>
            <span>{formatDate(sale.created_at)}</span>
          </div>
          {sale.customer && (
            <div className="flex justify-between">
              <span>Client:</span>
              <span>{sale.customer.first_name} {sale.customer.last_name}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Paiement:</span>
            <span>{getPaymentMethodLabel(sale.payment_method)}</span>
          </div>
        </div>

        {/* Items */}
        <div className="items mb-4 pb-4 border-b border-dashed border-gray-400">
          <p className="font-bold mb-2">Articles:</p>
          {sale.items.map((item, index) => (
            <div key={item.id || index} className="item mb-2">
              <p className="item-name">{item.product?.name || `Produit #${item.product_id}`}</p>
              <div className="item-details flex justify-between pl-2 text-gray-600">
                <span>{item.quantity} x {formatCurrency(item.unit_price)}</span>
                <span>{formatCurrency(item.total)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="totals">
          <div className="flex justify-between">
            <span>Sous-total:</span>
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
              <span>Taxe:</span>
              <span>{formatCurrency(sale.tax)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t border-gray-800">
            <span>TOTAL:</span>
            <span>{formatCurrency(sale.final_amount)}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="footer text-center mt-4 pt-4 border-t border-dashed border-gray-400 text-xs text-gray-500">
          <p>Merci pour votre achat !</p>
          <p>Conservez ce ticket comme preuve d'achat</p>
          <p className="mt-2">*** Pharmacie Manager ***</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-center gap-3 mt-6">
        <button onClick={onClose} className="btn-secondary">
          Fermer
        </button>
        <button onClick={handlePrint} className="btn-primary flex items-center gap-2">
          <Printer className="w-5 h-5" />
          Imprimer
        </button>
      </div>
    </Modal>
  );
}

