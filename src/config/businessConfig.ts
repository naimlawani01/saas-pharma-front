/**
 * Configuration des types d'activité supportés par l'application
 */

export type BusinessType = 
  | 'pharmacy'      // Pharmacie
  | 'grocery'       // Épicerie / Alimentation
  | 'hardware'      // Quincaillerie
  | 'cosmetics'     // Cosmétiques / Parfumerie
  | 'auto_parts'    // Pièces auto
  | 'clothing'      // Vêtements / Mode
  | 'electronics'   // Électronique
  | 'restaurant'    // Restaurant / Bar
  | 'wholesale'     // Grossiste
  | 'general';      // Commerce général

export interface BusinessTypeConfig {
  id: BusinessType;
  name: string;
  description: string;
  icon: string;
  color: string;
  features: {
    prescriptions: boolean;      // Module ordonnances
    expiryDates: boolean;        // Gestion des dates d'expiration
    batchNumbers: boolean;       // Numéros de lot
    dci: boolean;                // Dénomination Commune Internationale (médicaments)
    dosage: boolean;             // Dosage (médicaments)
    barcode: boolean;            // Code-barres
    variants: boolean;           // Variantes (taille, couleur)
    tables: boolean;             // Gestion des tables (restaurant)
  };
  terminology: {
    business: string;            // "Pharmacie", "Boutique", etc.
    businessPlural: string;      // "Pharmacies", "Boutiques", etc.
    product: string;             // "Médicament", "Article", etc.
    productPlural: string;       // "Médicaments", "Articles", etc.
    license: string;             // "N° Ordre", "RCCM", etc.
    licensePlaceholder: string;  // Exemple de format
  };
}

export const businessTypes: Record<BusinessType, BusinessTypeConfig> = {
  pharmacy: {
    id: 'pharmacy',
    name: 'Pharmacie',
    description: 'Officine pharmaceutique, parapharmacie',
    icon: '💊',
    color: 'emerald',
    features: {
      prescriptions: true,
      expiryDates: true,
      batchNumbers: true,
      dci: true,
      dosage: true,
      barcode: true,
      variants: false,
      tables: false,
    },
    terminology: {
      business: 'Pharmacie',
      businessPlural: 'Pharmacies',
      product: 'Médicament',
      productPlural: 'Médicaments',
      license: "N° d'Ordre",
      licensePlaceholder: 'PHARMA-2024-001',
    },
  },
  grocery: {
    id: 'grocery',
    name: 'Épicerie / Alimentation',
    description: 'Superette, alimentation générale, boutique',
    icon: '🛒',
    color: 'orange',
    features: {
      prescriptions: false,
      expiryDates: true,
      batchNumbers: false,
      dci: false,
      dosage: false,
      barcode: true,
      variants: false,
      tables: false,
    },
    terminology: {
      business: 'Boutique',
      businessPlural: 'Boutiques',
      product: 'Article',
      productPlural: 'Articles',
      license: 'RCCM',
      licensePlaceholder: 'GN.TCC.2024.A.0001',
    },
  },
  hardware: {
    id: 'hardware',
    name: 'Quincaillerie',
    description: 'Matériaux de construction, outillage',
    icon: '🔧',
    color: 'slate',
    features: {
      prescriptions: false,
      expiryDates: false,
      batchNumbers: false,
      dci: false,
      dosage: false,
      barcode: true,
      variants: true,
      tables: false,
    },
    terminology: {
      business: 'Quincaillerie',
      businessPlural: 'Quincailleries',
      product: 'Article',
      productPlural: 'Articles',
      license: 'RCCM',
      licensePlaceholder: 'GN.TCC.2024.A.0001',
    },
  },
  cosmetics: {
    id: 'cosmetics',
    name: 'Cosmétiques / Parfumerie',
    description: 'Produits de beauté, parfums, soins',
    icon: '💄',
    color: 'pink',
    features: {
      prescriptions: false,
      expiryDates: true,
      batchNumbers: true,
      dci: false,
      dosage: false,
      barcode: true,
      variants: true,
      tables: false,
    },
    terminology: {
      business: 'Boutique',
      businessPlural: 'Boutiques',
      product: 'Produit',
      productPlural: 'Produits',
      license: 'RCCM',
      licensePlaceholder: 'GN.TCC.2024.A.0001',
    },
  },
  auto_parts: {
    id: 'auto_parts',
    name: 'Pièces Auto',
    description: 'Pièces détachées, accessoires auto/moto',
    icon: '🚗',
    color: 'blue',
    features: {
      prescriptions: false,
      expiryDates: false,
      batchNumbers: true,
      dci: false,
      dosage: false,
      barcode: true,
      variants: true,
      tables: false,
    },
    terminology: {
      business: 'Magasin',
      businessPlural: 'Magasins',
      product: 'Pièce',
      productPlural: 'Pièces',
      license: 'RCCM',
      licensePlaceholder: 'GN.TCC.2024.A.0001',
    },
  },
  clothing: {
    id: 'clothing',
    name: 'Vêtements / Mode',
    description: 'Prêt-à-porter, chaussures, accessoires',
    icon: '👕',
    color: 'violet',
    features: {
      prescriptions: false,
      expiryDates: false,
      batchNumbers: false,
      dci: false,
      dosage: false,
      barcode: true,
      variants: true,
      tables: false,
    },
    terminology: {
      business: 'Boutique',
      businessPlural: 'Boutiques',
      product: 'Article',
      productPlural: 'Articles',
      license: 'RCCM',
      licensePlaceholder: 'GN.TCC.2024.A.0001',
    },
  },
  electronics: {
    id: 'electronics',
    name: 'Électronique',
    description: 'Téléphones, ordinateurs, accessoires',
    icon: '📱',
    color: 'cyan',
    features: {
      prescriptions: false,
      expiryDates: false,
      batchNumbers: true,
      dci: false,
      dosage: false,
      barcode: true,
      variants: true,
      tables: false,
    },
    terminology: {
      business: 'Magasin',
      businessPlural: 'Magasins',
      product: 'Article',
      productPlural: 'Articles',
      license: 'RCCM',
      licensePlaceholder: 'GN.TCC.2024.A.0001',
    },
  },
  restaurant: {
    id: 'restaurant',
    name: 'Restaurant / Bar',
    description: 'Restauration, bar, café',
    icon: '🍽️',
    color: 'amber',
    features: {
      prescriptions: false,
      expiryDates: true,
      batchNumbers: false,
      dci: false,
      dosage: false,
      barcode: false,
      variants: false,
      tables: true,
    },
    terminology: {
      business: 'Restaurant',
      businessPlural: 'Restaurants',
      product: 'Plat',
      productPlural: 'Plats',
      license: 'Licence',
      licensePlaceholder: 'REST-2024-001',
    },
  },
  wholesale: {
    id: 'wholesale',
    name: 'Grossiste',
    description: 'Vente en gros, distribution',
    icon: '📦',
    color: 'indigo',
    features: {
      prescriptions: false,
      expiryDates: true,
      batchNumbers: true,
      dci: false,
      dosage: false,
      barcode: true,
      variants: true,
      tables: false,
    },
    terminology: {
      business: 'Entrepôt',
      businessPlural: 'Entrepôts',
      product: 'Article',
      productPlural: 'Articles',
      license: 'RCCM',
      licensePlaceholder: 'GN.TCC.2024.A.0001',
    },
  },
  general: {
    id: 'general',
    name: 'Commerce Général',
    description: 'Autre type de commerce',
    icon: '🏪',
    color: 'gray',
    features: {
      prescriptions: false,
      expiryDates: false,
      batchNumbers: false,
      dci: false,
      dosage: false,
      barcode: true,
      variants: false,
      tables: false,
    },
    terminology: {
      business: 'Commerce',
      businessPlural: 'Commerces',
      product: 'Article',
      productPlural: 'Articles',
      license: 'RCCM',
      licensePlaceholder: 'GN.TCC.2024.A.0001',
    },
  },
};

// Liste des types d'activité sous forme de tableau (pour les sélecteurs)
export const BUSINESS_TYPES: BusinessTypeConfig[] = Object.values(businessTypes);

// Stockage local du type d'activité
const BUSINESS_TYPE_KEY = 'geststock_business_type';

export function getBusinessType(): BusinessType {
  try {
    const stored = localStorage.getItem(BUSINESS_TYPE_KEY);
    if (stored && stored in businessTypes) {
      return stored as BusinessType;
    }
  } catch (e) {
    console.error('Erreur lecture type activité:', e);
  }
  return 'general'; // Par défaut
}

export function setBusinessType(type: BusinessType): void {
  localStorage.setItem(BUSINESS_TYPE_KEY, type);
}

export function getBusinessConfig(): BusinessTypeConfig {
  return businessTypes[getBusinessType()];
}

// Helper pour vérifier si une fonctionnalité est activée
export function isFeatureEnabled(feature: keyof BusinessTypeConfig['features']): boolean {
  return getBusinessConfig().features[feature];
}

// Helper pour obtenir la terminologie
export function getTerm(term: keyof BusinessTypeConfig['terminology']): string {
  return getBusinessConfig().terminology[term];
}

