import type { FinanceSettings } from './FinanceSettings';
import type { Transaction } from './Transaction';

export const UNCATEGORISED = 'Uncategorised';

// income: money in. spend: money out. refund: money back in a spending category.
export type RowKind = 'income' | 'spend' | 'refund' | 'skip';

// True when a row belongs in totals (right currency, not a transfer, not ignored).
export function isCounted(t: Transaction, s: FinanceSettings): boolean {
	return t.currency === s.currency && !t.isTransfer && !s.ignoreCategories.includes(t.category);
}

// Decides how one row affects the totals.
export function rowKind(t: Transaction, s: FinanceSettings): RowKind {
	if (!isCounted(t, s)) return 'skip';
	if (t.amount < 0) return 'spend';
	if (s.incomeCategories.includes(t.category) || t.category === UNCATEGORISED) return 'income';
	return 'refund';
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
