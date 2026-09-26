import type { Transaction } from './Transaction';

// Every month that has rows, oldest first.
export function monthList(rows: Transaction[]): string[] {
	return [...new Set(rows.map((t) => t.month))].sort();
}
