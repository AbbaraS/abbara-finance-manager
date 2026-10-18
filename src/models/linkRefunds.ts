import { setLabel, type Labels } from './Labels';
import type { Transaction } from './Transaction';

// What's still spent on a purchase after its refunds (0 = all refunded).
export function keptOf(t: Transaction): number {
	return Math.max(0, pennies(-t.amount - t.refunds.reduce((s, r) => s + r.amount, 0)));
}

// Money in that isn't linked to a purchase yet (Mum's £100 with £55 linked to Clarks: £45).
export function notGivenBack(t: Transaction): number {
	return Math.max(0, pennies(t.amount - t.givenBack));
}

// Purchases a payment could pay back: money out in the same currency, from 120 days before to 31 days after it,
// not transfers, with something still to give back. Newest first.
export function purchasesFor(rows: Transaction[], payment: Transaction): Transaction[] {
	const day = (d: string) => Date.parse(d) / 86400000;
	const paid = day(payment.date);
	return rows.filter((t) => t.amount < 0 && t.currency === payment.currency && t.kind !== 'transfer' && t.kind !== 'saving'
		&& day(t.date) >= paid - 120 && day(t.date) <= paid + 31 && keptOf(t) > 0 && !t.refunds.some((r) => r.t.id === payment.id))
		.sort((a, b) => b.date.localeCompare(a.date));
}

// Links a payment (money in) to a purchase it pays back, for `amount` (default: as much as both have left). Its one-off
// category goes, so it takes the purchase's; the person stays.
export function linkBack(labels: Labels, payment: Transaction, purchase: Transaction, amount = Math.min(notGivenBack(payment), keptOf(purchase))): void {
	const now = (labels.transactions[payment.id]?.backFor ?? []).filter((b) => b.purchase !== purchase.id);
	setLabel(labels, payment.id, { backFor: [...now, { purchase: purchase.id, amount: pennies(amount) }], category: '', sub: '' });
}

// Changes how much of a linked payment goes to a purchase.
export function setBackAmount(labels: Labels, payment: string, purchase: string, amount: number): void {
	const now = labels.transactions[payment]?.backFor ?? [];
	setLabel(labels, payment, { backFor: now.map((b) => (b.purchase === purchase ? { ...b, amount: pennies(amount) } : b)) });
}

// True when you linked this payment to this purchase yourself (unlinking removes your link instead of blocking one).
export function linkedByYou(labels: Labels, payment: string, purchase: string): boolean {
	return (labels.transactions[payment]?.backFor ?? []).some((b) => b.purchase === purchase);
}

// Unlinks a payment you linked from a purchase.
export function unlinkBack(labels: Labels, payment: string, purchase: string): void {
	setLabel(labels, payment, { backFor: (labels.transactions[payment]?.backFor ?? []).filter((b) => b.purchase !== purchase) });
}

// Rounds to pennies, so sums like 0.1 + 0.2 settle.
const pennies = (n: number) => Math.round(n * 100) / 100;

// True when a purchase was refunded in full (shown faded and struck through).
export function fullyRefunded(t: Transaction): boolean {
	return t.refunds.length > 0 && keptOf(t) === 0;
}
