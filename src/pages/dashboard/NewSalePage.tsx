import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import ReceiptModal from '@/components/sales/ReceiptModal';
import QuoteModal from '@/components/sales/QuoteModal';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { 
  Search, 
  Plus, 
  Minus, 
  Trash2,
  ShoppingCart,
  User,
  CreditCard,
  Banknote,
  Smartphone,
  ArrowLeft,
  X,
  Scan,
  Wifi,
  WifiOff,
  FileText,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { isOfflineError } from '@/utils/offlineHandler';
import { CashSession, CashSessionStatus } from '@/types/cash';
import { getFromOffline } from '@/services/offlineStorage';
import { cashStore } from '@/services/offlineStorage';

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
  phone: string | null;
}

const paymentMethods = [
  { id: 'cash', name: 'Espèces', icon: Banknote },
  { id: 'card', name: 'Carte', icon: CreditCard },
  { id: 'mobile_money', name: 'Mobile Money', icon: Smartphone },
];

export default function NewSalePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [createdSale, setCreatedSale] = useState<any>(null);
  const [showQuote, setShowQuote] = useState(false);
  const [barcodeScannerEnabled, setBarcodeScannerEnabled] = useState(true);
  const [lastScannedBarcode, setLastScannedBarcode] = useState<string | null>(null);
  const [selectedPrescriptionId, setSelectedPrescriptionId] = useState<number | null>(null);

  // Rechercher les clients
  const { data: customers } = useQuery({
    queryKey: ['customers-search', customerSearch],
    queryFn: async () => {
      if (customerSearch.length < 2) return [];
      const response = await api.get(`/customers?search=${customerSearch}`);
      return response.data as Customer[];
    },
    enabled: customerSearch.length >= 2,
  });

  // Récupérer les prescriptions du client sélectionné
  const { data: prescriptions } = useQuery({
    queryKey: ['prescriptions-customer', customerId],
    queryFn: async () => {
      if (!customerId) return [];
      const response = await api.get(`/prescriptions/customer/${customerId}?status_filter=active`);
      return response.data;
    },
    enabled: !!customerId,
  });

  // Vérifier si une session de caisse est ouverte
  const { data: currentCashSession } = useQuery({
    queryKey: ['current-cash-session'],
    queryFn: async () => {
      try {
        const response = await api.get('/cash/sessions/current');
        return response.data as CashSession | null;
      } catch {
        // Si erreur (offline ou pas de session), vérifier la session locale
        const localSession = await getFromOffline<CashSession>(cashStore, 'pending_session');
        return localSession;
      }
    },
    refetchInterval: 10000, // Rafraîchir toutes les 10s
    refetchOnWindowFocus: true,
  });

  // Vérifier si une caisse est ouverte (serveur ou locale)
  const isCashOpen = currentCashSession?.status === CashSessionStatus.OPEN || 
                     currentCashSession?.status === CashSessionStatus.PENDING_OFFLINE;

  // Rechercher les produits
  const { data: products } = useQuery({
    queryKey: ['products-search', search],
    queryFn: async () => {
      if (search.length < 2) return [];
      const response = await api.get(`/products?search=${search}`);
      return response.data as Product[];
    },
    enabled: search.length >= 2,
  });

  // Recherche spécifique par code-barres (plus rapide)
  const searchByBarcode = useMutation({
    mutationFn: async (barcode: string) => {
      const response = await api.get(`/products?search=${barcode}`);
      return response.data as Product[];
    },
  });

  // Gestion du scan de code-barres
  const handleBarcodeScan = async (barcode: string) => {
    // Ignorer si c'est le même code-barres scanné récemment (éviter les doublons)
    if (lastScannedBarcode === barcode) {
      return;
    }
    
    setLastScannedBarcode(barcode);
    
    // Réinitialiser après 2 secondes
    setTimeout(() => {
      setLastScannedBarcode(null);
    }, 2000);

    try {
      // Rechercher le produit par code-barres
      const products = await searchByBarcode.mutateAsync(barcode);
      
      if (products.length === 0) {
        toast.error(`Produit non trouvé (code: ${barcode})`);
        return;
      }

      const product = products[0];
      
      // Vérifier le stock
      if (product.quantity <= 0) {
        toast.error('Produit en rupture de stock');
        return;
      }

      // Ajouter au panier
      addToCart(product);
      toast.success(`${product.name} ajouté au panier`, { icon: '✅' });
      
      // Réinitialiser la recherche
      setSearch('');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la recherche');
    }
  };

  // Activer le scanner de code-barres
  const { isScanning, scannerType, connectSerialScanner, isSerialSupported } = useBarcodeScanner({
    onScan: handleBarcodeScan,
    enabled: barcodeScannerEnabled,
    minLength: 8,
    maxLength: 20,
    timeout: 100,
  });

  // Créer la vente
  const createSale = useMutation({
    mutationFn: async () => {
      const saleData = {
        pharmacy_id: user?.pharmacy_id,
        user_id: user?.id,
        customer_id: customerId,
        prescription_id: selectedPrescriptionId,
        total_amount: subtotal,
        discount,
        tax: 0,
        payment_method: paymentMethod,
        items: cart.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity,
          unit_price: item.product.selling_price,
          discount: 0,
        })),
      };
      return api.post('/sales', saleData);
    },
    onSuccess: (response) => {
      // Invalider les caches pour rafraîchir les données
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['low-stock'] });
      queryClient.invalidateQueries({ queryKey: ['top-products'] });
      queryClient.invalidateQueries({ queryKey: ['current-cash-session'] }); // ✅ Actualiser la caisse
      
      // Préparer les données pour le ticket
      const saleWithItems = {
        ...response.data,
        customer: selectedCustomer,
        items: cart.map((item, index) => ({
          id: index,
          product_id: item.product.id,
          quantity: item.quantity,
          unit_price: item.product.selling_price,
          discount: 0,
          total: item.product.selling_price * item.quantity,
          product: { id: item.product.id, name: item.product.name },
        })),
      };
      
      setCreatedSale(saleWithItems);
      setShowReceipt(true);
      toast.success('Vente enregistrée avec succès !');
    },
    onError: (error: any) => {
      if (isOfflineError(error)) {
        // Vente sauvegardée offline, afficher le reçu localement
        const saleWithItems = {
          id: `temp-${Date.now()}`,
          sale_number: `TEMP-${Date.now()}`,
          customer_id: customerId,
          total_amount: subtotal,
          discount,
          tax: 0,
          final_amount: total,
          payment_method: paymentMethod,
          status: 'pending',
          created_at: new Date().toISOString(),
          customer: selectedCustomer,
          items: cart.map((item, index) => ({
            id: index,
            product_id: item.product.id,
            quantity: item.quantity,
            unit_price: item.product.selling_price,
            discount: 0,
            total: item.product.selling_price * item.quantity,
            product: { id: item.product.id, name: item.product.name },
          })),
        };
        
        setCreatedSale(saleWithItems);
        setShowReceipt(true);
        toast.success('Vente enregistrée localement. Synchronisation automatique à la reconnexion.');
        
        // Vider le panier après affichage du reçu
        setTimeout(() => {
          setCart([]);
          setDiscount(0);
          setCustomerId(null);
          setSelectedCustomer(null);
        }, 1000);
      } else {
        toast.error(error.response?.data?.detail || 'Erreur lors de la vente');
      }
    },
  });

  const handleCloseReceipt = () => {
    setShowReceipt(false);
    setCreatedSale(null);
    setCart([]);
    setDiscount(0);
    setCustomerId(null);
    setSelectedCustomer(null);
    navigate('/sales');
  };

  const selectCustomer = (customer: Customer) => {
    setCustomerId(customer.id);
    setSelectedCustomer(customer);
    setCustomerSearch('');
    setShowCustomerDropdown(false);
    setSelectedPrescriptionId(null); // Réinitialiser la prescription uniquement
    // Ne pas vider le panier - l'utilisateur peut changer de client sans perdre ses produits
  };

  const clearCustomer = () => {
    setCustomerId(null);
    setSelectedCustomer(null);
    setSelectedPrescriptionId(null);
    // Ne pas vider le panier - l'utilisateur peut supprimer le client sans perdre ses produits
  };

  // Charger les produits de la prescription dans le panier
  const loadPrescriptionProducts = async (prescriptionId: number) => {
    try {
      const response = await api.get(`/prescriptions/${prescriptionId}`);
      const prescription = response.data;
      
      // Vider le panier actuel
      setCart([]);
      
      // Ajouter les produits de la prescription
      const newCart: CartItem[] = [];
      for (const item of prescription.items) {
        if (item.product) {
          const remainingQuantity = item.quantity_prescribed - item.quantity_used;
          if (remainingQuantity > 0) {
            // Récupérer le produit complet pour avoir le stock
            const productResponse = await api.get(`/products/${item.product_id}`);
            const product = productResponse.data;
            
            if (product.quantity > 0) {
              newCart.push({
                product: {
                  id: product.id,
                  name: product.name,
                  selling_price: product.selling_price,
                  quantity: product.quantity,
                },
                quantity: Math.min(remainingQuantity, product.quantity),
              });
            }
          }
        }
      }
      
      setCart(newCart);
      toast.success(`${newCart.length} produit(s) chargé(s) depuis la prescription`);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors du chargement de la prescription');
    }
  };

  const addToCart = (product: Product) => {
    const existing = cart.find(item => item.product.id === product.id);
    if (existing) {
      if (existing.quantity < product.quantity) {
        setCart(cart.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        ));
      } else {
        toast.error('Stock insuffisant');
      }
    } else {
      setCart([...cart, { product, quantity: 1 }]);
    }
    setSearch('');
  };

  const updateQuantity = (productId: number, delta: number) => {
    setCart(cart.map(item => {
      if (item.product.id === productId) {
        const newQty = item.quantity + delta;
        if (newQty < 1) return item;
        if (newQty > item.product.quantity) {
          toast.error('Stock insuffisant');
          return item;
        }
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (productId: number) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.product.selling_price * item.quantity, 0);
  const total = subtotal - discount;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-GN').format(value) + ' GNF';
  };

  const handleSubmit = () => {
    if (cart.length === 0) {
      toast.error('Ajoutez des produits au panier');
      return;
    }
    
    // Vérifier si une caisse est ouverte
    if (!isCashOpen) {
      toast.error('Vous devez ouvrir une caisse avant de pouvoir effectuer une vente');
      return;
    }
    
    createSale.mutate();
  };

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={() => navigate('/sales')}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Nouvelle vente</h1>
          <p className="text-gray-500">Créer une nouvelle transaction</p>
        </div>
      </div>

      {/* Alerte si aucune caisse n'est ouverte */}
      {!isCashOpen && (
        <div className="card bg-yellow-50 border-yellow-200 mb-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-yellow-900">Aucune caisse ouverte</p>
              <p className="text-sm text-yellow-700">
                Vous devez ouvrir une session de caisse avant de pouvoir effectuer des ventes.
                <button
                  onClick={() => navigate('/cash')}
                  className="ml-2 underline font-medium hover:text-yellow-900"
                >
                  Ouvrir une caisse
                </button>
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product search and cart */}
        <div className="lg:col-span-2 space-y-6">
          {/* Search */}
          <div className="card">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher un produit (nom ou code-barre)..."
                  className="input pl-10"
                  autoFocus
                />
              </div>
              {/* Scanner controls */}
              <div className="flex items-center gap-2">
                {isScanning && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-xs font-medium text-green-700">
                      {scannerType === 'serial' ? 'Serial' : 'USB'} actif
                    </span>
                  </div>
                )}
                <button
                  onClick={() => setBarcodeScannerEnabled(!barcodeScannerEnabled)}
                  className={clsx(
                    'p-2 rounded-lg transition-colors',
                    barcodeScannerEnabled
                      ? 'bg-primary-100 text-primary-700 hover:bg-primary-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                  title={barcodeScannerEnabled ? 'Désactiver le scanner' : 'Activer le scanner'}
                >
                  <Scan className="w-5 h-5" />
                </button>
                {isSerialSupported && (
                  <button
                    onClick={async () => {
                      try {
                        await connectSerialScanner();
                        toast.success('Scanner Serial connecté');
                      } catch (error: any) {
                        toast.error(error.message || 'Erreur de connexion');
                      }
                    }}
                    className="p-2 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                    title="Connecter un scanner Serial/Bluetooth"
                  >
                    {scannerType === 'serial' ? (
                      <Wifi className="w-5 h-5" />
                    ) : (
                      <WifiOff className="w-5 h-5" />
                    )}
                  </button>
                )}
              </div>
            </div>
            {!barcodeScannerEnabled && (
              <div className="text-xs text-gray-500 bg-yellow-50 p-2 rounded border border-yellow-200">
                ⚠️ Scanner désactivé - Activez-le pour scanner les codes-barres
              </div>
            )}
            
            {/* Search results */}
            {products && products.length > 0 && (
              <div className="mt-4 border rounded-lg divide-y max-h-60 overflow-y-auto">
                {products.map(product => (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className="w-full flex items-center justify-between p-3 hover:bg-gray-50 text-left"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{product.name}</p>
                      <p className="text-sm text-gray-500">Stock: {product.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-primary-600">
                        {formatCurrency(product.selling_price)}
                      </p>
                      <Plus className="w-5 h-5 text-gray-400" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Cart */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Panier ({cart.length} article{cart.length > 1 ? 's' : ''})
            </h3>
            
            {cart.length > 0 ? (
              <div className="space-y-3">
                {cart.map(item => (
                  <div key={item.product.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{item.product.name}</p>
                      <p className="text-sm text-gray-500">
                        {formatCurrency(item.product.selling_price)} / unité
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.product.id, -1)}
                        className="p-1 hover:bg-gray-200 rounded"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-10 text-center font-medium">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product.id, 1)}
                        className="p-1 hover:bg-gray-200 rounded"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="w-28 text-right font-medium text-gray-900">
                      {formatCurrency(item.product.selling_price * item.quantity)}
                    </div>
                    
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="p-2 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Le panier est vide</p>
                <p className="text-sm">Recherchez des produits à ajouter</p>
              </div>
            )}
          </div>
        </div>

        {/* Summary */}
        <div className="space-y-6">
          {/* Customer selection */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              Client (optionnel)
            </h3>
            
            {selectedCustomer ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-primary-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">
                      {selectedCustomer.first_name} {selectedCustomer.last_name}
                    </p>
                    {selectedCustomer.phone && (
                      <p className="text-sm text-gray-500">{selectedCustomer.phone}</p>
                    )}
                  </div>
                  <button
                    onClick={clearCustomer}
                    className="p-1 hover:bg-primary-100 rounded"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>

                {/* Prescription selection */}
                {prescriptions && prescriptions.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Prescription (optionnel)
                    </label>
                    <select
                      value={selectedPrescriptionId || ''}
                      onChange={(e) => {
                        const prescriptionId = e.target.value ? parseInt(e.target.value) : null;
                        setSelectedPrescriptionId(prescriptionId);
                        if (prescriptionId) {
                          loadPrescriptionProducts(prescriptionId);
                        } else {
                          setCart([]);
                        }
                      }}
                      className="input text-sm"
                    >
                      <option value="">Aucune prescription</option>
                      {prescriptions.map((prescription: any) => (
                        <option key={prescription.id} value={prescription.id}>
                          {prescription.prescription_number} - {prescription.doctor_name}
                          {prescription.expiry_date && new Date(prescription.expiry_date) < new Date() && ' (Expirée)'}
                        </option>
                      ))}
                    </select>
                    {selectedPrescriptionId && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPrescriptionId(null);
                          setCart([]);
                        }}
                        className="mt-2 text-xs text-red-600 hover:text-red-700"
                      >
                        Effacer la prescription
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setShowCustomerDropdown(true);
                  }}
                  onFocus={() => setShowCustomerDropdown(true)}
                  placeholder="Rechercher un client..."
                  className="input pl-10 text-sm"
                />
                
                {/* Customer dropdown */}
                {showCustomerDropdown && customers && customers.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {customers.map(customer => (
                      <button
                        key={customer.id}
                        onClick={() => selectCustomer(customer)}
                        className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 text-left"
                      >
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-gray-500" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">
                            {customer.first_name} {customer.last_name}
                          </p>
                          {customer.phone && (
                            <p className="text-xs text-gray-500">{customer.phone}</p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                
                {showCustomerDropdown && customerSearch.length >= 2 && (!customers || customers.length === 0) && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg p-4 text-center text-gray-500 text-sm">
                    Aucun client trouvé
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Payment method */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Mode de paiement</h3>
            <div className="grid grid-cols-3 gap-2">
              {paymentMethods.map(method => (
                <button
                  key={method.id}
                  onClick={() => setPaymentMethod(method.id)}
                  className={clsx(
                    'flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-colors',
                    paymentMethod === method.id
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <method.icon className="w-6 h-6" />
                  <span className="text-xs font-medium">{method.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Discount */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Remise</h3>
            <input
              type="number"
              value={discount}
              onChange={(e) => setDiscount(Math.max(0, parseInt(e.target.value) || 0))}
              className="input"
              placeholder="0"
              min="0"
            />
          </div>

          {/* Total */}
          <div className="card bg-primary-50">
            <div className="space-y-3">
              <div className="flex justify-between text-gray-600">
                <span>Sous-total</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Remise</span>
                  <span>-{formatCurrency(discount)}</span>
                </div>
              )}
              <div className="border-t border-primary-200 pt-3 flex justify-between text-xl font-bold text-primary-700">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
            
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowQuote(true)}
                disabled={cart.length === 0}
                className="btn-secondary flex-1 py-3 text-base flex items-center justify-center gap-2"
              >
                <FileText className="w-5 h-5" />
                Générer un devis
              </button>
              <button
                onClick={handleSubmit}
                disabled={cart.length === 0 || createSale.isPending || !isCashOpen}
                className="btn-primary flex-1 py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                title={!isCashOpen ? 'Ouvrez une caisse avant de valider la vente' : ''}
              >
                {createSale.isPending ? 'Traitement...' : 'Valider la vente'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Receipt Modal */}
      <ReceiptModal
        isOpen={showReceipt}
        onClose={handleCloseReceipt}
        sale={createdSale}
      />

      {/* Quote Modal */}
      <QuoteModal
        isOpen={showQuote}
        onClose={() => setShowQuote(false)}
        cart={cart}
        subtotal={subtotal}
        discount={discount}
        total={total}
        customer={selectedCustomer}
      />
    </div>
  );
}

