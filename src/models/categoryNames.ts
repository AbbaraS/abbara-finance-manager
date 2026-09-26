import { UNCATEGORISED } from './rowKind';
import type { Transaction } from './Transaction';

// Every category used in the data (except Uncategorised), A-Z.
export function categoryNames(rows: Transaction[]): string[] {
	const names = new Set(rows.map((t) => t.category));
	names.delete(UNCATEGORISED);
	return [...names].sort((a, b) => a.localeCompare(b));
}
