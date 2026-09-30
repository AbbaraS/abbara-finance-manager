import type { FinanceSettings } from './FinanceSettings';
import type { Transaction } from './Transaction';

export const UNCATEGORISED = 'Uncategorised';

// income: money in. spend: money out. refund: money back in a Spending or People category.
export type RowKind = 'income' | 'spend' | 'refund' | 'skip';

// False for transfers and savings: they have their own section / card, not income or spending.
export function countsKind(t: Transaction): boolean {
	return t.kind !== 'transfer' && t.kind !== 'saving';
}

// Decides how one row affects the totals. Only Income categories are income; other money in is a refund or not counted.
export function rowKind(t: Transaction, s: FinanceSettings): RowKind {
	if (t.currency !== s.currency || !countsKind(t)) return 'skip';
	if (t.amount < 0) return 'spend';
	if (t.kind === 'income') return 'income';
	return t.kind === 'spending' || t.kind === 'people' ? 'refund' : 'skip'; // uncategorised money in isn't counted
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
