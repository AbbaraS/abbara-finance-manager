import type { FinanceSettings } from './FinanceSettings';
import { isCounted, UNCATEGORISED } from './rowKind';
import type { Transaction } from './Transaction';

// Uncategorised rows that share a description.
export interface UncategorisedGroup {
	description: string;
	count: number;
	total: number;      // signed: money out is negative
	accounts: string[];
}

// This month's uncategorised rows, grouped so you can write rules for them.
export function uncategorised(rows: Transaction[], month: string, s: FinanceSettings): UncategorisedGroup[] {
	const groups = new Map<string, Transaction[]>();
	for (const t of rows) {
		if (t.month !== month || t.category !== UNCATEGORISED || !isCounted(t, s)) continue;
		const key = t.description.replace(/\s+/g, ' ').trim();
		groups.set(key, [...(groups.get(key) ?? []), t]);
	}
	const list = [...groups].map(([description, items]) => ({
		description,
		count: items.length,
		total: items.reduce((a, t) => a + t.amount, 0),
		accounts: [...new Set(items.map((t) => t.account))],
	}));
	return list.sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
}
