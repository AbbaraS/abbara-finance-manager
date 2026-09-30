import { dayNumber } from '../utils/dayNumber';
import type { Transaction } from './Transaction';

// Most days between the two sides of one transfer.
const MAX_GAP = 4;

// Finds the other side of each move: same amount, opposite sign, another account, within MAX_GAP days.
// `candidates` are rows that may be the other side. `hint` gives a row's known other account ('' = any):
// a pair must agree with it. Closest dates first, then rows already in a Transfer category.
export function pairTransfers(moves: Transaction[], candidates: Transaction[], hint: (t: Transaction) => string): Map<string, Transaction> {
	const byAmount = new Map<string, Transaction[]>();
	for (const t of candidates) {
		const k = amountKey(t.amount, t.currency);
		byAmount.set(k, [...(byAmount.get(k) ?? []), t]);
	}

	// Every possible pair, closest first.
	const options: { a: Transaction; b: Transaction; gap: number }[] = [];
	for (const a of moves) {
		const ha = hint(a);
		for (const b of byAmount.get(amountKey(-a.amount, a.currency)) ?? []) {
			const gap = Math.abs(dayNumber(a.date) - dayNumber(b.date));
			const hb = hint(b);
			if (b.account === a.account || gap > MAX_GAP || (ha && ha !== b.account) || (hb && hb !== a.account)) continue;
			options.push({ a, b, gap: gap + (b.kind === 'transfer' ? 0 : 0.5) });
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
