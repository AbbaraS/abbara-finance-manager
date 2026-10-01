import { REFUND } from './categorise';
import type { Labels } from './Labels';
import type { Transaction } from './Transaction';

// A category's subcategories (a person's own under People): saved ones plus any used by rows or counterparties, A-Z.
export function subcategoryNames(category: string, person: string, labels: Labels, rows: Transaction[]): string[] {
	const names = new Set<string>();
	for (const s of labels.subcategories) if (s.parent === category && s.person === person) names.add(s.name);
	for (const r of labels.counterparties) if (r.category === category && (r.person ?? '') === person && r.subcategory) names.add(r.subcategory);
	for (const t of rows) if (t.category === category && t.person === person && t.subcategory && t.subcategory !== REFUND) names.add(t.subcategory);
	return [...names].sort((a, b) => a.localeCompare(b));
}
