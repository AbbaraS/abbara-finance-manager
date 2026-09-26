import type { FinanceSettings } from './FinanceSettings';
import { UNCATEGORISED } from './rowKind';
import { ruleMatches } from './ruleMatches';
import type { Transaction } from './Transaction';

// Copies the rows with a category: one-off edit first, then the first matching rule.
export function categorise(rows: Transaction[], s: FinanceSettings): Transaction[] {
	const known = new Set(s.categories.map((c) => c.name));
	const rules = s.rules.filter((r) => known.has(r.category)); // skip rules for deleted categories

	return rows.map((t): Transaction => {
		const edit = s.edits[t.key];
		if (edit && known.has(edit)) return { ...t, category: edit, source: 'edit' };
		const rule = rules.find((r) => ruleMatches(r, t));
		if (rule) return { ...t, category: rule.category, source: 'rule' };
		return { ...t, category: UNCATEGORISED, source: 'none' };
	});
}
