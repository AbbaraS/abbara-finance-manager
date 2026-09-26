import type { Transaction } from '../models/Transaction';

// Gives each row a key that survives re-running myFinances. Identical rows get #0, #1...
export function addKeys(rows: Transaction[]): void {
	const seen = new Map<string, number>();
	for (const t of rows) {
		const base = `${t.date}|${t.account}|${t.amount.toFixed(2)}|${t.description}`;
		const n = seen.get(base) ?? 0;
		seen.set(base, n + 1);
		t.key = `${base}#${n}`;
	}
}
