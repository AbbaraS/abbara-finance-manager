import { categoryKind } from './categoryKind';
import type { FinanceSettings } from './FinanceSettings';
import type { Transaction } from './Transaction';

export const UNCATEGORISED = 'Uncategorised';

// income: money in. spend: money out. refund: money back in a spending category.
export type RowKind = 'income' | 'spend' | 'refund' | 'skip';

// Kinds left out of income and spending (they have their own card / section).
const NOT_COUNTED = new Set(['investment', 'transfer', 'excluded']);

// True when money in on this row's account can be income.
export function isIncomeAccount(t: Transaction, s: FinanceSettings): boolean {
	return s.incomeAccounts.includes(t.account);
}

// True when a category's rows go into income / spending (Uncategorised does).
export function countsCategory(name: string, s: FinanceSettings): boolean {
	return !NOT_COUNTED.has(categoryKind(name, s) ?? '');
}

// True when a row belongs in income / spending (right currency, a counted kind).
export function isCounted(t: Transaction, s: FinanceSettings): boolean {
	return t.currency === s.currency && countsCategory(t.category, s);
}

// Decides how one row affects the totals.
export function rowKind(t: Transaction, s: FinanceSettings): RowKind {
	if (!isCounted(t, s)) return 'skip';
	if (t.amount < 0) return 'spend';
	if (categoryKind(t.category, s) === 'spending') return 'refund';
	return isIncomeAccount(t, s) ? 'income' : 'skip'; // income or uncategorised money in
}

// How much a row adds to spending (refunds give a negative number).
export function spendOf(t: Transaction, s: FinanceSettings): number {
	const kind = rowKind(t, s);
	return kind === 'spend' || kind === 'refund' ? -t.amount : 0;
}

// How much a row adds to income.
export function incomeOf(t: Transaction, s: FinanceSettings): number {
	return rowKind(t, s) === 'income' ? t.amount : 0;
}
