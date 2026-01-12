'use server';

import { db } from '@/lib/db';
import type { Product, Sale, Expense } from '@/lib/types';

export async function getDashboardData() {
  const products: Product[] = await db.all('SELECT * FROM products');
  const sales: Sale[] = await db.all('SELECT * FROM sales');
  const expenses: Expense[] = await db.all('SELECT * FROM expenses');

  const totalRevenue = sales.reduce((s, v) => s + v.total, 0);
  const totalExpenses = expenses.reduce((s, v) => s + v.amount, 0);
  const lowStock = products.filter(p => p.quantity <= p.reorderLevel).length;

  return {
    products,
    sales,
    expenses,
    stats: {
      totalProducts: products.length,
      totalRevenue,
      totalExpenses,
      profit: totalRevenue - totalExpenses,
      lowStock,
    },
  };
}