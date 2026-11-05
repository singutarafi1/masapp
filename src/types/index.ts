export type UserRole = 'admin' | 'staff';

export interface UserProfile {
  uid: string;
  name: string;
  email?: string;
  role: UserRole;
}

export interface HistoryItem {
  msg: string;
  by: string;
  time: string; // ISO string
}

export interface ProductItem {
  id: string;
  name: string;
  category: 'အထွေထွေ' | 'Hardwareအပိုပစ္စည်' | 'accessories' | string;
  amount: number;
  costPrice: number;
  price: number;
  status: 'ပစ္စည်းရှိ' | 'လက်ကျန်ပြတ်' | 'ရောင်းပြီး' | string;
  sellDate?: string;
  date?: string;
  debtId?: string;
  createdAt?: any;
  updatedAt?: any;
  history?: HistoryItem[];
}

export type RepairStatus =
  | 'စစ်ဆေးပြုပြင်နေဆဲ'
  | 'ပြင်ပြီး-မရွေးသေး'
  | 'ပြင်မရ-မရွေးသေး'
  | 'ထုတ်ယူပြီး-အောင်မြင်'
  | 'ထုတ်ယူပြီး-ပြင်မရ'
  | 'ပယ်ဖျက် (Void)';

export interface RepairItem {
  id: string;
  vrno: number | string;
  date: string;
  name: string;
  phone?: string;
  location?: string;
  model: string;
  issue: string;
  remark?: string;
  status: RepairStatus;
  cost?: number;
  income?: number;
  timestamp?: any;
  updatedAt?: any;
  collectedAt?: any;
  history?: HistoryItem[];
}

export type TransactionType = 'ဝင်ငွေ' | 'ထွက်ငွေ';
export type TransactionGroup =
  | 'Service'
  | 'Sales'
  | 'StockPurchase'
  | 'Office'
  | 'Home'
  | 'Handover'
  | 'OwnerFund'
  | 'CashDiff'
  | 'Personal'
  | string;

export interface TransactionItem {
  id: string;
  type: TransactionType;
  group: TransactionGroup;
  name: string;
  amount: number;
  date: any; // Firestore Timestamp or Date
  exactDate?: any;
  productId?: string;
  repairId?: string;
  debtId?: string;
  transferId?: string;
  transferPair?: 'handover' | 'ownerfund';
  subGroup?: string;
  note?: string;
  voided?: boolean;
  voidedBy?: string;
  source?: 'auto' | 'tx';
  history?: HistoryItem[];
}

export interface DebtPayment {
  amount: number;
  date: string;
  by: string;
  note?: string;
  txId?: string;
  soldId?: string;
}

export type DebtStatus = 'ကျန်ရှိ' | 'ရှင်းပြီး' | 'void';

export interface DebtItem {
  id: string;
  customer: string;
  phone?: string;
  note?: string;
  productId?: string;
  productName: string;
  category?: string;
  qty: number;
  unitPrice: number;
  unitCost: number;
  total: number;
  cost: number;
  paid: number;
  status: DebtStatus;
  payments: DebtPayment[];
  date: any;
  createdAt?: any;
  updatedAt?: any;
  createdBy: string;
  voidedAt?: any;
  voidedBy?: string;
  history?: HistoryItem[];
}

export interface DayFinanceSummary {
  inc: number;
  exp: number;
  xOut: number;
  xIn: number;
  logs: TransactionItem[];
}

export type SortType = 'modified_desc' | 'date_desc' | 'name_asc';

export interface ActivityLogItem {
  id: string;
  type: string;
  action: string;
  details: string;
  user: string;
  timestamp: any;
}

export interface AppCategoryConfig {
  personal?: string[];
  service?: string[];
  stockPurchase?: string[];
  office?: string[];
  sales?: string[];
  capital?: string[];
  home?: string[];
}
