import { categoryKind } from './categoryKind';
import type { FinanceSettings } from './FinanceSettings';
import type { Transaction } from './Transaction';

// Money put into investments (money taken out is subtracted).
export interface Invested {
	total: number;     // every month
	thisMonth: number;
	bySub: { name: string; total: number }[]; // all months, per subcategory, biggest first
}

// Adds up rows in Investment-kind categories.
export function invested(rows: Transaction[], month: string, s: FinanceSettings): Invested {
	const list = rows.filter((t) => t.currency === s.currency && categoryKind(t.category) === 'investment');
	const subs = new Map<string, number>();
	for (const t of list) {
		const name = t.subcategory || t.category;
		subs.set(name, (subs.get(name) ?? 0) - t.amount);
	}
	return {
		total: list.reduce((a, t) => a - t.amount, 0),
		thisMonth: list.filter((t) => t.month === month).reduce((a, t) => a - t.amount, 0),
		bySub: [...subs].map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total),
	};
}
