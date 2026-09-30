import { dayNumber } from '../utils/dayNumber';
import type { Transaction } from './Transaction';

// Most days between the two sides of one transfer.
const MAX_GAP = 4;

// Finds the other side of each move: same amount, opposite sign, another account, within MAX_GAP days.
// `candidates` are rows that may be the other side. Closest dates are paired first.
export function pairTransfers(moves: Transaction[], candidates: Transaction[]): Map<string, Transaction> {
	const byAmount = new Map<string, Transaction[]>();
	for (const t of candidates) {
		const k = amountKey(t.amount, t.currency);
		byAmount.set(k, [...(byAmount.get(k) ?? []), t]);
	}

	// Every possible pair, closest first.
	const options: { a: Transaction; b: Transaction; gap: number }[] = [];
	for (const a of moves) {
		for (const b of byAmount.get(amountKey(-a.amount, a.currency)) ?? []) {
			const gap = Math.abs(dayNumber(a.date) - dayNumber(b.date));
			if (b.account !== a.account && gap <= MAX_GAP) options.push({ a, b, gap });
		}
	}
	options.sort((x, y) => x.gap - y.gap);

	// Each row is used once.
	const pairs = new Map<string, Transaction>();
	for (const { a, b } of options) {
		if (pairs.has(a.id) || pairs.has(b.id)) continue;
		pairs.set(a.id, b);
		pairs.set(b.id, a);
	}
	return pairs;
}

// Amount in pence + currency, so floats compare safely.
function amountKey(amount: number, currency: string): string {
	return `${Math.round(amount * 100)}|${currency}`;
}
