import { useRef } from 'react';
import { Printer, FileText } from 'lucide-react';
import Modal from '@/components/ui/Modal';

interface Product {
  id: number;
  name: string;
  selling_price: number;
  quantity: number;
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface Customer {
  id: number;
  first_name: string;
  last_name: string;
  phone?: string | null;
}

interface QuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  subtotal: number;
  discount: number;
  total: number;
  customer?: Customer | null;
  pharmacyName?: string;
  pharmacyAddress?: string;
  pharmacyPhone?: string;
  pharmacyEmail?: string;
}

export default function QuoteModal({ 
  isOpen, 
  onClose, 
  cart,
  subtotal,
  discount,
  total,
  customer,
  pharmacyName = "Pharmacie Centrale",
  pharmacyAddress = "Rue de la République, Conakry",
  pharmacyPhone = "+224 620 00 00 00",
  pharmacyEmail = "contact@pharmacie-centrale.gn"
}: QuoteModalProps) {
  const quoteRef = useRef<HTMLDivElement>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-GN').format(value) + ' GNF';
  };

  const formatDate = () => {
    return new Date().toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  // Générer un numéro de devis unique
  const quoteNumber = `DEV-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

  const handlePrint = () => {
    const printContent = quoteRef.current;
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
          <title>Devis - ${quoteNumber}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Arial', sans-serif;
              font-size: 12px;
              width: 210mm;
              padding: 20mm;
              background: white;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 2px solid #3b82f6;
            }
            .header h1 {
              font-size: 28px;
              margin-bottom: 10px;
              font-weight: bold;
              color: #1e40af;
              background: #dbeafe;
              padding: 10px 20px;
              display: inline-block;
              border-radius: 8px;
            }
            .header p {
              font-size: 11px;
              color: #666;
              margin: 2px 0;
            }
            .quote-info {
              display: flex;
              justify-content: space-between;
              margin-bottom: 30px;
            }
            .quote-info .left, .quote-info .right {
              width: 48%;
            }
            .quote-info h2 {
              font-size: 18px;
              margin-bottom: 15px;
              color: #333;
            }
            .quote-info p {
              font-size: 11px;
              margin: 5px 0;
              color: #555;
            }
            .quote-info .label {
              font-weight: bold;
              color: #333;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            .items-table thead {
              background: linear-gradient(to right, #3b82f6, #2563eb);
              color: white;
            }
            .items-table th {
              padding: 12px;
              text-align: left;
              border: none;
              font-weight: bold;
              font-size: 11px;
            }
            .items-table td {
              padding: 10px 12px;
              border-bottom: 1px solid #e5e7eb;
              font-size: 11px;
            }
            .items-table tbody tr:hover {
              background-color: #f9fafb;
            }
            .totals {
              margin-top: 20px;
              margin-left: auto;
              width: 350px;
              background: linear-gradient(to bottom right, #f9fafb, #f3f4f6);
              padding: 20px;
              border-radius: 8px;
            }
            .totals-row {
              display: table;
              width: 100%;
              padding: 8px 0;
              font-size: 12px;
            }
            .totals-row > span:first-child {
              display: table-cell;
              text-align: left;
              width: 50%;
            }
            .totals-row > span:last-child {
              display: table-cell;
              text-align: right;
              width: 50%;
              font-variant-numeric: tabular-nums;
            }
            .totals-row.total {
              font-size: 18px;
              font-weight: bold;
              border-top: 2px solid #3b82f6;
              padding-top: 12px;
              margin-top: 12px;
              color: #1e40af;
            }
            .totals-row.total > span:last-child {
              font-size: 18px;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              text-align: center;
              font-size: 10px;
              color: #666;
            }
            @media print {
              body { 
                width: 210mm; 
                margin: 0;
                padding: 20mm;
              }
              .no-print {
                display: none;
              }
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

  if (cart.length === 0) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Devis" size="md">
        <div className="text-center py-8 text-gray-500">
          <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p>Le panier est vide</p>
          <p className="text-sm mt-2">Ajoutez des produits pour générer un devis</p>
        </div>
        <div className="flex justify-end mt-6">
          <button onClick={onClose} className="btn-secondary">
            Fermer
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Devis" size="lg">
      {/* Quote Preview */}
      <div 
        ref={quoteRef}
        className="bg-white p-6 border rounded-lg"
        style={{ maxWidth: '800px', margin: '0 auto' }}
      >
        {/* Header */}
        <div className="header text-center mb-8 pb-6 border-b-2 border-primary-500">
          <div className="inline-block px-6 py-2 bg-primary-50 rounded-lg mb-4">
            <h1 className="text-3xl font-bold text-primary-700 mb-1">{pharmacyName}</h1>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-gray-700 font-medium">{pharmacyAddress}</p>
            <p className="text-sm text-gray-600">📞 {pharmacyPhone}</p>
            {pharmacyEmail && (
              <p className="text-sm text-gray-600">✉️ {pharmacyEmail}</p>
            )}
          </div>
        </div>

        {/* Quote Info */}
        <div className="quote-info mb-8 grid grid-cols-2 gap-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h2 className="text-lg font-bold mb-4 text-primary-700 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              DEVIS
            </h2>
            <div className="space-y-2">
              <p className="text-sm">
                <span className="font-semibold text-gray-700">N° Devis:</span>{' '}
                <span className="font-mono text-primary-600">{quoteNumber}</span>
              </p>
              <p className="text-sm">
                <span className="font-semibold text-gray-700">Date:</span>{' '}
                <span className="text-gray-600">{formatDate()}</span>
              </p>
              {customer && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="font-semibold text-gray-700 mb-2">Client:</p>
                  <p className="text-gray-800 font-medium">{customer.first_name} {customer.last_name}</p>
                  {customer.phone && (
                    <p className="text-sm text-gray-600 mt-1">📞 {customer.phone}</p>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="bg-primary-50 p-4 rounded-lg text-right">
            <h2 className="text-lg font-bold mb-4 text-primary-700">INFORMATIONS</h2>
            <div className="space-y-2 text-sm">
              <p className="text-gray-700">
                <span className="font-semibold">Validité:</span> 30 jours
              </p>
              <p className="text-gray-700">
                <span className="font-semibold">Devise:</span> GNF
              </p>
              <p className="text-gray-700">
                <span className="font-semibold">TVA:</span> Non applicable
              </p>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-8">
          <table className="items-table w-full border-collapse">
            <thead>
              <tr className="bg-gradient-to-r from-primary-500 to-primary-600 text-white">
                <th style={{ width: '5%' }} className="px-4 py-3 text-left rounded-tl-lg">#</th>
                <th style={{ width: '45%' }} className="px-4 py-3 text-left">Désignation</th>
                <th style={{ width: '10%', textAlign: 'center' }} className="px-4 py-3">Qté</th>
                <th style={{ width: '15%', textAlign: 'right' }} className="px-4 py-3">Prix unitaire</th>
                <th style={{ width: '15%', textAlign: 'right' }} className="px-4 py-3 rounded-tr-lg">Total</th>
              </tr>
            </thead>
            <tbody>
              {cart.map((item, index) => (
                <tr 
                  key={item.product.id}
                  className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3 text-gray-600">{index + 1}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{item.product.name}</td>
                  <td style={{ textAlign: 'center' }} className="px-4 py-3">
                    <span className="inline-block px-2 py-1 bg-primary-100 text-primary-700 rounded font-semibold">
                      {item.quantity}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }} className="px-4 py-3 text-gray-700">
                    {formatCurrency(item.product.selling_price)}
                  </td>
                  <td style={{ textAlign: 'right' }} className="px-4 py-3 font-bold text-primary-700">
                    {formatCurrency(item.product.selling_price * item.quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="totals ml-auto bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-lg shadow-sm" style={{ width: '350px' }}>
          <div className="space-y-3">
            <div className="totals-row text-gray-700">
              <span className="font-medium">Sous-total:</span>
              <span className="font-semibold">{formatCurrency(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="totals-row text-red-600">
                <span className="font-medium">Remise:</span>
                <span className="font-semibold">-{formatCurrency(discount)}</span>
              </div>
            )}
            <div className="border-t-2 border-primary-500 pt-3 mt-3">
              <div className="totals-row total">
                <span>TOTAL TTC:</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="footer mt-10 pt-6 border-t-2 border-gray-200 text-center">
          <div className="bg-primary-50 rounded-lg p-4 mb-4">
            <p className="text-primary-700 font-semibold text-sm mb-1">Merci de votre confiance</p>
            <p className="text-gray-600 text-xs">Pour toute question, contactez-nous au {pharmacyPhone}</p>
          </div>
          <p className="text-xs text-gray-400 font-medium">Pharmacie Manager - Système de gestion professionnel</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-center gap-3 mt-6">
        <button onClick={onClose} className="btn-secondary">
          Fermer
        </button>
        <button onClick={handlePrint} className="btn-primary flex items-center gap-2">
          <Printer className="w-5 h-5" />
          Imprimer le devis
        </button>
      </div>
    </Modal>
  );
}

