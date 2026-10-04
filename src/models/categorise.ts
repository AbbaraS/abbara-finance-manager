import type { Counterparty } from './Counterparty';
import type { Labels } from './Labels';
import type { Person } from './people';
import { UNCATEGORISED } from './rowKind';
import { counterpartyMatches, textMatches } from './counterpartyMatches';
import { linkRefunds } from './linkRefunds';
import { linkSubscriptions } from './subscriptions';
import { linkTransfers } from './transferFlows';
import type { Transaction } from './Transaction';

// Subcategory shown for money in under a Spending category.
export const REFUND = 'Refund';

// Who a row is with: a counterparty picked by hand, else a person whose spellings match, else the first matching counterparty.
export function whoFor(labels: Labels, t: Transaction, picked = labels.transactions[t.id]?.counterparty ?? ''): { cp?: Counterparty; person?: Person } {
	const hand = picked ? labels.counterparties.find((x) => x.name === picked) : undefined;
	if (hand) return { cp: hand };
	const person = labels.people.find((p) => textMatches(p.patterns ?? [], t.description));
	return person ? { person } : { cp: labels.counterparties.find((x) => counterpartyMatches(x, t)) };
}

// Copies the rows with your labels; who each is with comes from whoFor.
// Category, subcategory and person: one-off edit first (all three together), then the counterparty's or the person's.
// Then pairs up transfers (see linkTransfers), refunds with their purchases (see linkRefunds) and finds subscription payments (see linkSubscriptions).
// Tags: the row's own, plus its counterparty's and subscription's (autoTags).
export function categorise(rows: Transaction[], labels: Labels): Transaction[] {
	const kinds = new Map(labels.categories.map((c) => [c.name, c.kind]));
	const debts = new Map(labels.debts.filter((d) => d.transaction).map((d) => [d.transaction, d]));

	const done = rows.map((t): Transaction => {
		const l = labels.transactions[t.id] ?? {};
		const { cp, person: who } = whoFor(labels, t);
		const edit = l.category && kinds.has(l.category) ? l.category : '';
		const rule = !edit && cp && kinds.has(cp.category) ? cp : undefined; // the counterparty decides the category
		const found = !edit && who && kinds.has(who.category) ? who : undefined; // or the person, under their People category
		const category = edit || rule?.category || found?.category || UNCATEGORISED;
		const kind = kinds.get(category) ?? null;
		// A one-off edit's subcategory and person only go with its category; otherwise the counterparty's.
		const sub = edit ? l.sub ?? '' : rule?.subcategory ?? '';
		const person = kind === 'people' ? (edit ? l.person ?? '' : rule?.person ?? found?.name ?? '') : '';
		return {
			...t,
			counterparty: cp?.name ?? '',
			category,
			kind,
			source: edit ? 'edit' : rule ? 'rule' : found ? 'person' : 'none',
			subcategory: sub || (kind === 'spending' && t.amount > 0 ? REFUND : ''), // money back goes into its category
			person,
			note: l.note ?? '',
			tags: l.tags ?? [],
			autoTags: cp?.tags ?? [],
			otherAccount: l.other ?? '',
			debt: debts.get(t.id) ?? null,
		};
	});
	const linked = linkTransfers(done, labels.accounts);
	// Refunds: who a row is with, ignoring a counterparty's "money out only" (its refunds come in).
	const anyWay = labels.counterparties.map((x) => ({ ...x, direction: '' as const }));
	linkRefunds(linked, (t) => t.counterparty || anyWay.find((x) => counterpartyMatches(x, t))?.name || '');
	linkSubscriptions(linked, labels);

	// Tags from the subscription too; tags the row already has itself aren't repeated.
	const subTags = new Map(labels.subscriptions.map((s) => [s.name, s.tags ?? []]));
	for (const t of linked) t.autoTags = [...new Set([...t.autoTags, ...(subTags.get(t.subscription) ?? [])])].filter((x) => !t.tags.includes(x));
	return linked;
}
