import { dayNumber } from '../utils/dayNumber';
import { guessPattern } from './guessCounterparty';
import { UNCATEGORISED } from './rowKind';
import type { Transaction } from './Transaction';

// Most days between a purchase and its refund.
const MAX_DAYS = 90;

// Pairs money back with the purchase it refunds: same account, same counterparty (or same-looking description),
// where `who` says who a row is with even when its counterparty only finds money out (e.g. Pegasus refunds),
// bought on or before the refund, within MAX_DAYS. A purchase can have several refunds (partial refunds),
// as long as they add up to no more than it cost. Best first: same description (e.g. the same Amazon order),
// same amount, the purchase left closest to the refund, nearest date.
// An uncategorised refund takes its purchase's category; a refund in the same category takes its subcategory.
// A refund without a counterparty takes its purchase's. `unlinked` gives the purchases a refund was unlinked from by hand.
export function linkRefunds(rows: Transaction[], who: (t: Transaction) => string = (t) => t.counterparty,
	unlinked: (t: Transaction) => string[] = () => []): void {
	for (const t of rows) {
		t.refundOf = null;
		t.refunds = [];
	}
	const shop = (t: Transaction) => t.kind === 'spending' || t.kind === null;
	const keyOf = (t: Transaction) => `${t.account}|${t.currency}|${who(t) || guessPattern(t.description).toLowerCase()}`;

	// Purchases by key; what's left of each to refund.
	const purchases = new Map<string, Transaction[]>();
	for (const t of rows) if (t.amount < 0 && shop(t)) purchases.set(keyOf(t), [...(purchases.get(keyOf(t)) ?? []), t]);
	const left = new Map<string, number>();

	const refunds = rows.filter((t) => t.amount > 0 && shop(t)).sort((a, b) => a.date.localeCompare(b.date));
	for (const r of refunds) {
		const day = dayNumber(r.date);
		const not = unlinked(r);
		const options = (purchases.get(keyOf(r)) ?? []).filter((p) => {
			const gap = day - dayNumber(p.date);
			return !not.includes(p.id) && gap >= 0 && gap <= MAX_DAYS && r.amount <= (left.get(p.id) ?? -p.amount) + 0.005;
		});
		const rank = (p: Transaction) => [
			Number(p.description !== r.description),
			Number(Math.abs(-p.amount - r.amount) > 0.005),
			(left.get(p.id) ?? -p.amount) - r.amount,
			day - dayNumber(p.date),
		];
		const p = options.sort((a, b) => compare(rank(a), rank(b)))[0];
		if (!p) continue;

		r.refundOf = p;
		p.refunds.push(r);
		left.set(p.id, (left.get(p.id) ?? -p.amount) - r.amount);
		if (r.category === UNCATEGORISED && p.kind === 'spending') Object.assign(r, { category: p.category, kind: p.kind, source: 'refund', subcategory: p.subcategory });
		else if (r.category === p.category) r.subcategory = p.subcategory;
		r.counterparty ||= p.counterparty;
	}
}

// What's still spent on a purchase after its refunds (0 = all refunded).
export function keptOf(t: Transaction): number {
	return Math.max(0, -t.amount - t.refunds.reduce((s, r) => s + r.amount, 0));
}

// True when a purchase was refunded in full (shown faded and struck through).
export function fullyRefunded(t: Transaction): boolean {
	return t.refunds.length > 0 && keptOf(t) === 0;
}

// Compares two lists of numbers, first difference wins.
function compare(a: number[], b: number[]): number {
	for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i];
	return 0;
}
