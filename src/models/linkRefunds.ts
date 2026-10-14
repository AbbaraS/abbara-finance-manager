import type { Transaction } from './Transaction';

// What's still spent on a purchase after its refunds (0 = all refunded).
export function keptOf(t: Transaction): number {
	return Math.max(0, -t.amount - t.refunds.reduce((s, r) => s + r.amount, 0));
}

// True when a purchase was refunded in full (shown faded and struck through).
export function fullyRefunded(t: Transaction): boolean {
	return t.refunds.length > 0 && keptOf(t) === 0;
}
