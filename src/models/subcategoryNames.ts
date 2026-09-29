import type { FinanceSettings } from './FinanceSettings';
import type { Transaction } from './Transaction';

// Subcategories already used in a category (by rows or rules), A-Z.
export function subcategoryNames(category: string, s: FinanceSettings, rows: Transaction[]): string[] {
	const names = new Set<string>();
	for (const t of rows) if (t.category === category && t.subcategory) names.add(t.subcategory);
	for (const r of s.rules) if (r.category === category && r.subcategory) names.add(r.subcategory);
	return [...names].sort((a, b) => a.localeCompare(b));
}
