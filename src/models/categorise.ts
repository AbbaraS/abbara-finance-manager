import type { Labels } from './Labels';
import { UNCATEGORISED } from './rowKind';
import { counterpartyMatches } from './counterpartyMatches';
import { linkSubscriptions } from './subscriptions';
import { linkTransfers } from './transferFlows';
import type { Transaction } from './Transaction';

// Subcategory shown for money in under a Spending category.
export const REFUND = 'Refund';

// Copies the rows with your labels. Counterparty: picked by hand, else the first whose patterns match.
// Category, subcategory and person: one-off edit first (all three together), then the counterparty's (if its category exists).
// Then pairs up transfers (see linkTransfers) and finds subscription payments (see linkSubscriptions).
export function categorise(rows: Transaction[], labels: Labels): Transaction[] {
	const kinds = new Map(labels.categories.map((c) => [c.name, c.kind]));
	const all = labels.counterparties;

	const done = rows.map((t): Transaction => {
		const l = labels.transactions[t.id] ?? {};
		const cp = (l.counterparty ? all.find((x) => x.name === l.counterparty) : undefined) ?? all.find((x) => counterpartyMatches(x, t));
		const edit = l.category && kinds.has(l.category) ? l.category : '';
		const rule = !edit && cp && kinds.has(cp.category) ? cp : undefined; // the counterparty decides the category
		const category = edit || rule?.category || UNCATEGORISED;
		const kind = kinds.get(category) ?? null;
		// A one-off edit's subcategory and person only go with its category; otherwise the counterparty's.
		const sub = edit ? l.sub ?? '' : rule?.subcategory ?? '';
		const person = kind === 'people' ? (edit ? l.person ?? '' : rule?.person ?? '') : '';
		return {
			...t,
			counterparty: cp?.name ?? '',
			category,
			kind,
			source: edit ? 'edit' : rule ? 'rule' : 'none',
			subcategory: sub || (kind === 'spending' && t.amount > 0 ? REFUND : ''), // money back goes into its category
			person,
			note: l.note ?? '',
			tags: l.tags ?? [],
			otherAccount: l.other ?? '',
		};
	});
	const linked = linkTransfers(done, labels.accounts);
	linkSubscriptions(linked, labels);
	return linked;
}
