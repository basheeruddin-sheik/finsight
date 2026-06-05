import client from './client';
import type { MonthlyBreakdown, CategoryTrend, SavingsRateMonth, MoneyOutside } from '../types';

export const getMonthlyBreakdown = (month: string): Promise<MonthlyBreakdown> =>
  client.get('/reports/monthly', { params: { month } }).then(r => r.data);

export const getCategoryTrend = (category: string): Promise<CategoryTrend> =>
  client.get('/reports/category-trend', { params: { category } }).then(r => r.data);

export const getSavingsRateTrend = (months = 6): Promise<SavingsRateMonth[]> =>
  client.get('/reports/savings-rate', { params: { months } }).then(r => r.data);

export const getMoneyOutside = (): Promise<MoneyOutside> =>
  client.get('/reports/money-outside').then(r => r.data);
