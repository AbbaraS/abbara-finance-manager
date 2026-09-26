import type { FinanceSettings } from './FinanceSettings';
import type { Transaction } from './Transaction';

// How much a category is used, for the settings list.
export interface CategoryUsage {
	rules: number;
	edits: number;
	rows: number; // categorised transactions, all months
}

// Usage for one category. `rows` must already be categorised.
export function categoryUsage(name: string, s: FinanceSettings, rows: Transaction[]): CategoryUsage {
	return {
		rules: s.rules.filter((r) => r.category === name).length,
		edits: Object.values(s.edits).filter((c) => c === name).length,
		rows: rows.filter((t) => t.category === name).length,
	};
}
