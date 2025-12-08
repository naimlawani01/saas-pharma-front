export enum CashSessionStatus {
  OPEN = "open",
  CLOSED = "closed",
  PENDING_OFFLINE = "pending_offline", // statut local pour le mode offline
}

export enum TransactionType {
  OPENING = "opening",
  SALE = "sale",
  REFUND = "refund",
  EXPENSE = "expense",
  DEPOSIT = "deposit",
  WITHDRAWAL = "withdrawal",
  CORRECTION = "correction",
}

export enum PaymentMethod {
  CASH = "cash",
  CARD = "card",
  MOBILE_MONEY = "mobile_money",
  CHECK = "check",
  CREDIT = "credit",
}

export interface CashRegister {
  id: number;
  pharmacy_id: number;
  name: string;
  code: string;
  location: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CashCount {
  bills_20000: number;
  bills_10000: number;
  bills_5000: number;
  bills_2000: number;
  bills_1000: number;
  bills_500: number;
  coins_500: number;
  coins_100: number;
  coins_50: number;
  coins_25: number;
}

export interface CashSession {
  id: number;
  cash_register_id: number;
  pharmacy_id: number;
  opened_by: number;
  closed_by: number | null;
  session_number: string;
  status: CashSessionStatus;
  opening_date: string;
  opening_balance: number;
  opening_notes: string | null;
  closing_date: string | null;
  closing_balance: number | null;
  cash_counted: number | null;
  card_total: number | null;
  mobile_money_total: number | null;
  check_total: number | null;
  expected_cash: number | null;
  expected_total: number | null;
  cash_difference: number | null;
  total_difference: number | null;
  total_sales: number;
  total_refunds: number;
  total_expenses: number;
  sales_count: number;
  closing_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CashTransaction {
  id: number;
  session_id: number;
  pharmacy_id: number;
  user_id: number;
  transaction_type: TransactionType;
  payment_method: PaymentMethod;
  amount: number;
  reference_type: string | null;
  reference_id: number | null;
  reference_number: string | null;
  description: string | null;
  notes: string | null;
  created_at: string;
}

export interface CashRegisterStats {
  total_sessions: number;
  open_sessions: number;
  closed_sessions: number;
  total_sales_amount: number;
  total_cash_difference: number;
  average_session_amount: number;
}

