import type { FinanceSettings } from './FinanceSettings';
import { UNCATEGORISED } from './rowKind';
import type { Transaction } from './Transaction';

// Uncategorised rows that share a description.
export interface UncategorisedGroup {
	description: string;
	total: number;       // signed: money out is negative
	accounts: string[];
	rows: Transaction[];
}

// This month's uncategorised rows, grouped so one choice can cover them all.
export function uncategorised(rows: Transaction[], month: string, s: FinanceSettings): UncategorisedGroup[] {
	const groups = new Map<string, Transaction[]>();
	for (const t of rows) {
		if (t.month !== month || t.category !== UNCATEGORISED || t.currency !== s.currency) continue;
		groups.set(t.description, [...(groups.get(t.description) ?? []), t]);
	}
	const list = [...groups].map(([description, items]) => ({
		description,
		total: items.reduce((a, t) => a + t.amount, 0),
		accounts: [...new Set(items.map((t) => t.account))],
		rows: items,
	}));
	return list.sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
}
