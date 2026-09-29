import type { Transaction } from './Transaction';

// Same account, direction and description -> same kind of transfer.
export function moveSignature(t: Transaction): string {
	return `${t.account}|${t.amount < 0 ? 'out' : 'in'}|${t.description}`;
}

// From paired moves, the usual other account for each signature (most common wins).
export function learnCounterparts(moves: Transaction[], pairs: Map<string, Transaction>): Map<string, string> {
	const counts = new Map<string, Map<string, number>>();
	for (const t of moves) {
		const other = pairs.get(t.key);
		if (!other) continue;
		const sig = moveSignature(t);
		const byAccount = counts.get(sig) ?? new Map<string, number>();
		byAccount.set(other.account, (byAccount.get(other.account) ?? 0) + 1);
		counts.set(sig, byAccount);
	}

	const learned = new Map<string, string>();
	for (const [sig, byAccount] of counts) {
		const [best] = [...byAccount].sort((a, b) => b[1] - a[1]);
		learned.set(sig, best[0]);
	}
	return learned;
}
