export enum MovementType {
  SALE = "sale",
  PURCHASE = "purchase",
  ADJUSTMENT = "adjustment",
  RETURN = "return",
  EXPIRY = "expiry",
  DAMAGE = "damage",
  LOSS = "loss",
  TRANSFER = "transfer",
}

export enum AdjustmentReason {
  INVENTORY = "inventory",
  EXPIRY = "expiry",
  DAMAGE = "damage",
  LOSS = "loss",
  THEFT = "theft",
  ERROR = "error",
  RETURN_SUPPLIER = "return_supplier",
  OTHER = "other",
}

export enum AlertType {
  LOW_STOCK = "low_stock",
  OUT_OF_STOCK = "out_of_stock",
  EXPIRING_SOON = "expiring_soon",
  EXPIRED = "expired",
  OVERSTOCK = "overstock",
}

export enum AlertPriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

export interface StockMovement {
  id: number;
  pharmacy_id: number;
  product_id: number;
  user_id: number;
  movement_type: MovementType;
  quantity: number;
  quantity_before: number;
  quantity_after: number;
  reference_type: string | null;
  reference_id: number | null;
  unit_cost: number | null;
  notes: string | null;
  created_at: string;
  product?: {
    id: number;
    name: string;
    barcode?: string | null;
  };
}

export interface StockAdjustment {
  id: number;
  pharmacy_id: number;
  product_id: number;
  user_id: number;
  quantity_before: number;
  quantity_adjusted: number;
  quantity_after: number;
  reason: AdjustmentReason;
  notes: string | null;
  is_approved: boolean;
  approved_by: number | null;
  approved_at: string | null;
  created_at: string;
  product?: {
    id: number;
    name: string;
    barcode?: string | null;
  };
}

export interface Alert {
  id: number;
  pharmacy_id: number;
  product_id: number | null;
  alert_type: AlertType;
  priority: AlertPriority;
  title: string;
  message: string;
  is_read: boolean;
  is_resolved: boolean;
  resolved_at: string | null;
  resolved_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface InventoryItem {
  id: number;
  inventory_id: number;
  product_id: number;
  quantity_system: number;
  quantity_counted: number;
  quantity_difference: number;
  notes: string | null;
}

export interface Inventory {
  id: number;
  pharmacy_id: number;
  user_id: number;
  inventory_number: string;
  inventory_date: string;
  status: string;
  total_products_counted: number;
  total_discrepancies: number;
  notes: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  items: InventoryItem[];
}

export interface StockStats {
  total_products: number;
  low_stock_count: number;
  out_of_stock_count: number;
  expiring_soon_count: number;
  expired_count: number;
  total_value: number;
}

export interface AlertStats {
  total_alerts: number;
  unread_count: number;
  unresolved_count: number;
  by_type: Record<string, number>;
  by_priority: Record<string, number>;
}

