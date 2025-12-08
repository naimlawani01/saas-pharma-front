/**
 * Utilitaires pour l'export de données en PDF et Excel
 */

// Export en CSV (qui peut être ouvert dans Excel)
export function exportToCSV(data: any[], filename: string, headers?: string[]) {
  if (!data || data.length === 0) {
    throw new Error('Aucune donnée à exporter');
  }

  const keys = headers || Object.keys(data[0]);
  
  // Créer l'en-tête
  const headerRow = keys.join(';');
  
  // Créer les lignes de données
  const rows = data.map(item => 
    keys.map(key => {
      let value = item[key];
      
      // Formater les valeurs
      if (value === null || value === undefined) {
        value = '';
      } else if (typeof value === 'object') {
        value = JSON.stringify(value);
      } else if (typeof value === 'number') {
        value = value.toString().replace('.', ','); // Format français
      }
      
      // Échapper les guillemets et entourer de guillemets si nécessaire
      if (typeof value === 'string' && (value.includes(';') || value.includes('"') || value.includes('\n'))) {
        value = `"${value.replace(/"/g, '""')}"`;
      }
      
      return value;
    }).join(';')
  );
  
  // Ajouter BOM pour UTF-8 (pour Excel)
  const BOM = '\uFEFF';
  const csvContent = BOM + [headerRow, ...rows].join('\n');
  
  // Télécharger
  downloadFile(csvContent, `${filename}.csv`, 'text/csv;charset=utf-8');
}

// Export en PDF simple (format texte pour impression)
export function exportToPDF(title: string, content: string, _filename: string) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Veuillez autoriser les pop-ups pour exporter en PDF');
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: Arial, sans-serif; 
            padding: 20mm;
            font-size: 12px;
          }
          h1 { 
            font-size: 18px; 
            margin-bottom: 10px;
            color: #166534;
          }
          h2 {
            font-size: 14px;
            margin: 15px 0 10px 0;
            color: #333;
          }
          .header {
            text-align: center;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #166534;
          }
          .header p {
            color: #666;
            font-size: 10px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          th {
            background-color: #f5f5f5;
            font-weight: bold;
          }
          tr:nth-child(even) {
            background-color: #fafafa;
          }
          .total-row {
            font-weight: bold;
            background-color: #e8f5e9 !important;
          }
          .footer {
            margin-top: 30px;
            padding-top: 10px;
            border-top: 1px solid #ddd;
            font-size: 10px;
            color: #666;
            text-align: center;
          }
          @media print {
            body { padding: 10mm; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Pharmacie Manager</h1>
          <p>Rapport généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</p>
        </div>
        <h2>${title}</h2>
        ${content}
        <div class="footer">
          <p>Document généré automatiquement par Pharmacie Manager</p>
        </div>
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  
  // Laisser le temps au contenu de se charger
  setTimeout(() => {
    printWindow.print();
  }, 500);
}

// Télécharger un fichier
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

// Formater une date pour l'affichage
export function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('fr-FR');
}

// Formater un montant
export function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-GN').format(value) + ' GNF';
}

// Générer un tableau HTML à partir de données
export function generateHTMLTable(data: any[], columns: { key: string; label: string; format?: (v: any, item?: any) => string }[]) {
  if (!data || data.length === 0) {
    return '<p>Aucune donnée disponible</p>';
  }

  const headerRow = columns.map(col => `<th>${col.label}</th>`).join('');
  
  // Fonction helper pour obtenir une valeur par clé (support des clés imbriquées)
  const getNestedValue = (obj: any, key: string): any => {
    if (!key.includes('.')) {
      return obj[key];
    }
    const keys = key.split('.');
    let value = obj;
    for (const k of keys) {
      value = value?.[k];
      if (value === undefined || value === null) {
        return undefined;
      }
    }
    return value;
  };
  
  const bodyRows = data.map(item => 
    `<tr>${columns.map(col => {
      let value = getNestedValue(item, col.key);
      if (col.format) {
        value = col.format(value, item);
      }
      return `<td>${value ?? '-'}</td>`;
    }).join('')}</tr>`
  ).join('');

  return `
    <table>
      <thead><tr>${headerRow}</tr></thead>
      <tbody>${bodyRows}</tbody>
    </table>
  `;
}

// Export des ventes
export function exportSalesReport(sales: any[], period: string) {
  const filename = `rapport-ventes-${period}-${new Date().toISOString().split('T')[0]}`;
  
  // Pour CSV
  const csvData = sales.map(sale => ({
    'N° Vente': sale.sale_number,
    'Date': formatDate(sale.created_at),
    'Montant': sale.total_amount,
    'Remise': sale.discount,
    'Total': sale.final_amount,
    'Paiement': sale.payment_method === 'cash' ? 'Espèces' : 
                sale.payment_method === 'card' ? 'Carte' : 
                sale.payment_method === 'mobile_money' ? 'Mobile Money' : sale.payment_method,
    'Statut': sale.status === 'completed' ? 'Complétée' : 
              sale.status === 'cancelled' ? 'Annulée' : sale.status,
  }));

  exportToCSV(csvData, filename);
}

// Export des produits
export function exportProductsReport(products: any[]) {
  const filename = `inventaire-${new Date().toISOString().split('T')[0]}`;
  
  const csvData = products.map(p => ({
    'Nom': p.name,
    'Code-barres': p.barcode || '',
    'Catégorie': p.category?.name || '',
    'Stock': p.quantity,
    'Stock min': p.min_quantity,
    'Prix achat': p.purchase_price,
    'Prix vente': p.selling_price,
    'Expiration': p.expiry_date ? formatDate(p.expiry_date) : '',
    'Statut': p.is_active ? 'Actif' : 'Inactif',
  }));

  exportToCSV(csvData, filename);
}

// Alias pour Excel (utilise CSV)
export const exportToExcel = exportToCSV;

// Export rapport général en PDF
export function exportDashboardPDF(dashboardData: any, _salesData: any[], topProducts: any[]) {
  const content = `
    <h2>Résumé</h2>
    <table>
      <tr><th>Métrique</th><th>Valeur</th></tr>
      <tr><td>Ventes du jour</td><td>${formatCurrency(dashboardData?.daily_sales?.amount || 0)}</td></tr>
      <tr><td>Nombre de ventes</td><td>${dashboardData?.daily_sales?.count || 0}</td></tr>
      <tr><td>Produits en stock</td><td>${dashboardData?.inventory?.total_products || 0}</td></tr>
      <tr><td>Stock critique</td><td>${dashboardData?.inventory?.low_stock_count || 0}</td></tr>
      <tr><td>Expirations proches</td><td>${dashboardData?.inventory?.expiring_soon_count || 0}</td></tr>
    </table>

    ${topProducts && topProducts.length > 0 ? `
      <h2>Top produits vendus</h2>
      ${generateHTMLTable(topProducts, [
        { key: 'product_name', label: 'Produit' },
        { key: 'total_quantity', label: 'Quantité vendue' },
        { key: 'total_revenue', label: 'Chiffre d\'affaires', format: (v) => formatCurrency(v) },
      ])}
    ` : ''}
  `;

  exportToPDF('Rapport du tableau de bord', content, 'rapport-dashboard');
}

