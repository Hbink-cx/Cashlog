export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  parentId: string | null;
  color?: string;
  icon?: string;
}

export interface Transaction {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  categoryId: string;
  date: string; // YYYY-MM-DD
  description?: string;
  note?: string;
}

export interface Budget {
  id: string;
  categoryId: string;
  amount: number;
  period: 'monthly' | 'yearly';
  year?: number;
  month?: number; // 1-12, only for monthly
}

export interface AppData {
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
}

export type CategoryTreeNode = Category & {
  children: CategoryTreeNode[];
  depth: number;
  path: string[];
};

export interface CategorySummary {
  categoryId: string;
  categoryName: string;
  total: number;
  count: number;
  children: CategorySummary[];
  budget?: number;
  budgetUsage?: number;
}

export type ViewTab = 'dashboard' | 'transactions' | 'categories' | 'budgets' | 'analysis';
