import type { Transaction } from '../models/Transaction';
import { hashId } from '../utils/hashId';

// The text an id is made from: date, account, amount, description, and #n to tell identical rows apart.
export function keyText(t: Transaction, n: number): string {
	return `${t.date}|${t.account}|${t.amount.toFixed(2)}|${t.description}#${n}`;
}

// Gives each row a short id that survives re-running myFinances and adding older statements.
export function addKeys(rows: Transaction[]): void {
	const seen = new Map<string, number>();
	for (const t of rows) {
		const base = keyText(t, 0);
		const n = seen.get(base) ?? 0;
		seen.set(base, n + 1);
		t.key = hashId(keyText(t, n));
	}
}
