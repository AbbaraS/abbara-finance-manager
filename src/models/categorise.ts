import { CATEGORIES } from '../defaults/categories';
import type { Labels } from './Labels';
import { UNCATEGORISED } from './rowKind';
import { ruleMatches } from './ruleMatches';
import type { Transaction } from './Transaction';

// Copies the rows with category, subcategory and note: your one-off label first, then the first matching merchant rule.
export function categorise(rows: Transaction[], labels: Labels): Transaction[] {
	const known = new Set(CATEGORIES.map((c) => c.name));
	const rules = labels.rules.filter((r) => known.has(r.category)); // skip rules for unknown categories

	return rows.map((t): Transaction => {
		const l = labels.transactions[t.key] ?? {};
		const extra = { note: l.note ?? '', otherAccount: l.other ?? '' };
		if (l.category && known.has(l.category)) return { ...t, ...extra, category: l.category, source: 'edit', subcategory: l.sub ?? '' };
		const rule = rules.find((r) => ruleMatches(r, t));
		if (rule) return { ...t, ...extra, category: rule.category, source: 'rule', subcategory: l.sub ?? rule.subcategory ?? '' };
		return { ...t, ...extra, category: UNCATEGORISED, source: 'none', subcategory: l.sub ?? '' };
	});
}
