import type { Account } from './Labels';
import type { Transaction } from './Transaction';

// Every account: the ones in the data plus the ones you added, A-Z.
export function accountNames(rows: Transaction[], added: Account[] = []): string[] {
	return [...new Set([...rows.map((t) => t.account), ...added.map((a) => a.name)])].sort((a, b) => a.localeCompare(b));
}
