export type TransactionKind = "INCOME" | "EXPENSE" | "GOAL_CONTRIBUTION";
export type TransactionNature = "FIXED" | "VARIABLE" | "EXTRA";
export type TransactionStatus = "PENDING" | "SETTLED";

export interface Profile {
  id: string;
  full_name?: string;
  avatar_url?: string;
  email?: string;
  created_at?: string;
}

export interface Category {
  id: string;
  user_id?: string;
  name: string;
  kind: "INCOME" | "EXPENSE";
  icon: string;
  color: string;
  monthly_limit?: number;
  created_at?: string;
}

export interface Transaction {
  id: string;
  user_id?: string;
  kind: TransactionKind;
  nature: TransactionNature;
  description: string;
  amount: number; // Positive value; kind dictates sign
  date: string; // YYYY-MM-DD
  competence_month: string; // YYYY-MM
  status: TransactionStatus;
  category_id?: string;
  category_name?: string;
  goal_id?: string;
  notes?: string;
  created_at?: string;
}

export interface Goal {
  id: string;
  user_id?: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date?: string;
  icon: string;
  color: string;
  created_at?: string;
}

export interface RecurringRule {
  id: string;
  user_id?: string;
  description: string;
  amount: number;
  kind: "INCOME" | "EXPENSE";
  category_id?: string;
  category_name?: string;
  day_of_month: number;
  frequency: "MONTHLY" | "WEEKLY" | "YEARLY";
  icon?: string;
  is_active: boolean;
  last_generated_month?: string;
  created_at?: string;
}

export interface Settings {
  user_id?: string;
  financial_month_start_day: number;
  theme: "dark" | "light";
  currency: string;
  date_format: string;
  alert_limit?: boolean;
  alert_due_date?: boolean;
}

export type AlertType = "BUDGET_WARNING" | "BUDGET_EXCEEDED" | "DUE_SOON" | "OVERDUE" | "SYSTEM";

export interface FinanceAlert {
  id: string;
  type: AlertType;
  title: string;
  message: string;
  severity: "warning" | "danger" | "info";
  date?: string;
  amount?: number;
  categoryName?: string;
  read: boolean;
  link?: string;
}

