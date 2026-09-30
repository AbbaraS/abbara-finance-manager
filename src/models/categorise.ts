import type { Labels } from './Labels';
import { UNCATEGORISED } from './rowKind';
import { ruleMatches } from './ruleMatches';
import { linkTransfers } from './transferFlows';
import type { Transaction } from './Transaction';

// Subcategory shown for money in under a Spending category.
export const REFUND = 'Refund';

// Copies the rows with your labels: one-off category first, then the first matching merchant rule.
// Then pairs up transfers (see linkTransfers).
export function categorise(rows: Transaction[], labels: Labels): Transaction[] {
	const kinds = new Map(labels.categories.map((c) => [c.name, c.kind]));
	const rules = labels.rules.filter((r) => kinds.has(r.category)); // skip rules for deleted categories

	const done = rows.map((t): Transaction => {
		const l = labels.transactions[t.id] ?? {};
		const edit = l.category && kinds.has(l.category) ? l.category : '';
		const rule = edit ? undefined : rules.find((r) => ruleMatches(r, t));
		const category = edit || rule?.category || UNCATEGORISED;
		const kind = kinds.get(category) ?? null;
		const sub = l.sub ?? rule?.subcategory ?? '';
		return {
			...t,
			category,
			kind,
			source: edit ? 'edit' : rule ? 'rule' : 'none',
			subcategory: sub || (kind === 'spending' && t.amount > 0 ? REFUND : ''), // money back goes into its category
			note: l.note ?? '',
			tags: l.tags ?? [],
			otherAccount: l.other ?? '',
		};
	});
	return linkTransfers(done, labels.accounts);
}
