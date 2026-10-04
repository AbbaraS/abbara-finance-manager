import type { FinanceSettings } from './FinanceSettings';
import { rowKind, spendOf } from './rowKind';
import { newestFirst, type Transaction } from './Transaction';

// Spending for one group (a category or an account).
export interface SpendGroup {
	key: string;
	total: number;       // spending, refunds taken off
	share: number;       // 0-1 of all spending this month
	rows: Transaction[]; // the rows behind it, newest first
}

// Groups a month's spending by any key, biggest first.
export function groupSpending(
	rows: Transaction[], month: string, s: FinanceSettings, keyOf: (t: Transaction) => string,
): SpendGroup[] {
	const groups = new Map<string, Transaction[]>();
	for (const t of rows) {
		const kind = rowKind(t, s);
		if (t.month !== month || (kind !== 'spend' && kind !== 'refund')) continue;
		const key = keyOf(t);
		groups.set(key, [...(groups.get(key) ?? []), t]);
	}

	const list = [...groups].map(([key, items]) => ({
		key,
		total: items.reduce((a, t) => a + spendOf(t, s), 0),
		share: 0,
		rows: newestFirst(items),
	}));
	const all = list.reduce((a, g) => a + g.total, 0);
	list.forEach((g) => (g.share = all > 0 ? g.total / all : 0));
	return list.sort((a, b) => b.total - a.total);
}

// Spending by category.
export const byCategory = (rows: Transaction[], month: string, s: FinanceSettings) =>
	groupSpending(rows, month, s, (t) => t.category);

// Spending by account.
export const byAccount = (rows: Transaction[], month: string, s: FinanceSettings) =>
	groupSpending(rows, month, s, (t) => t.account);
