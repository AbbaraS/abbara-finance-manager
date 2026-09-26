import type { Transaction } from './Transaction';

// Every account in the data, A-Z.
export function accountNames(rows: Transaction[]): string[] {
	return [...new Set(rows.map((t) => t.account))].sort((a, b) => a.localeCompare(b));
}
