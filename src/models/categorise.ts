import type { FinanceSettings } from './FinanceSettings';
import { UNCATEGORISED } from './rowKind';
import { ruleMatches } from './ruleMatches';
import type { Transaction } from './Transaction';

// Copies the rows with category, subcategory and note: one-off edit first, then the first matching rule.
export function categorise(rows: Transaction[], s: FinanceSettings): Transaction[] {
	const known = new Set(s.categories.map((c) => c.name));
	const rules = s.rules.filter((r) => known.has(r.category)); // skip rules for deleted categories

	return rows.map((t): Transaction => {
		const d = s.details[t.key] ?? {};
		const extra = { note: d.note ?? '', otherAccount: d.other ?? '' };
		const edit = s.edits[t.key];
		if (edit && known.has(edit)) return { ...t, ...extra, category: edit, source: 'edit', subcategory: d.sub ?? '' };
		const rule = rules.find((r) => ruleMatches(r, t));
		if (rule) return { ...t, ...extra, category: rule.category, source: 'rule', subcategory: d.sub ?? rule.subcategory ?? '' };
		return { ...t, ...extra, category: UNCATEGORISED, source: 'none', subcategory: d.sub ?? '' };
	});
}
