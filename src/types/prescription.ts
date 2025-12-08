export enum PrescriptionStatus {
  ACTIVE = "active",
  USED = "used",
  PARTIALLY_USED = "partially_used",
  EXPIRED = "expired",
  CANCELLED = "cancelled",
}

export interface PrescriptionItem {
  id: number;
  prescription_id: number;
  product_id: number;
  quantity_prescribed: number;
  quantity_used: number;
  dosage?: string | null;
  duration?: string | null;
  instructions?: string | null;
  notes?: string | null;
  created_at: string;
  product?: {
    id: number;
    name: string;
    barcode?: string | null;
    sku?: string | null;
    selling_price: number;
  } | null;
}

export interface Prescription {
  id: number;
  pharmacy_id: number;
  customer_id: number;
  user_id?: number | null;
  prescription_number: string;
  doctor_name: string;
  doctor_specialty?: string | null;
  doctor_license_number?: string | null;
  doctor_phone?: string | null;
  prescription_date: string;
  expiry_date?: string | null;
  status: PrescriptionStatus;
  notes?: string | null;
  diagnosis?: string | null;
  created_at: string;
  updated_at: string;
  last_sync_at?: string | null;
  items: PrescriptionItem[];
  customer?: {
    id: number;
    first_name: string;
    last_name: string;
    phone?: string | null;
    email?: string | null;
  } | null;
}

export interface PrescriptionCreate {
  pharmacy_id: number;
  customer_id: number;
  user_id?: number | null;
  doctor_name: string;
  doctor_specialty?: string | null;
  doctor_license_number?: string | null;
  doctor_phone?: string | null;
  prescription_date: string;
  expiry_date?: string | null;
  diagnosis?: string | null;
  notes?: string | null;
  items: {
    product_id: number;
    quantity_prescribed: number;
    dosage?: string | null;
    duration?: string | null;
    instructions?: string | null;
    notes?: string | null;
  }[];
}

export interface PrescriptionUpdate {
  doctor_name?: string;
  doctor_specialty?: string | null;
  doctor_license_number?: string | null;
  doctor_phone?: string | null;
  prescription_date?: string;
  expiry_date?: string | null;
  diagnosis?: string | null;
  notes?: string | null;
  status?: PrescriptionStatus;
}

