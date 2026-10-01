import type { Direction } from '../models/Counterparty';
import type { Transaction } from '../models/Transaction';

// 'in' if every row is money in, 'out' if every row is money out, '' if mixed.
export function directionOf(rows: Transaction[]): Direction {
	if (rows.every((t) => t.amount > 0)) return 'in';
	if (rows.every((t) => t.amount < 0)) return 'out';
	return '';
}
