import { UNCATEGORISED } from '../models/rowKind';
import type { Transaction } from '../models/Transaction';
import { monthOf } from '../utils/dates';
import { parseCsv } from './parseCsv';

// Turns one combined CSV into transactions (not yet categorised). Bad rows are skipped.
export function toTransactions(text: string): Transaction[] {
	const [header, ...rows] = parseCsv(text);
	if (!header) return [];
	const col = (name: string) => header.findIndex((h) => h.trim().toLowerCase() === name);
	const at = { date: col('date'), account: col('account'), description: col('description'),
		amount: col('amount'), currency: col('currency') };

	const list: Transaction[] = [];
	for (const r of rows) {
		const date = (r[at.date] ?? '').trim().slice(0, 10);
		const amount = parseFloat(r[at.amount] ?? '');
		if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(amount)) continue;
		list.push({
			key: '', // set by addKeys once every file is read
			date,
			month: monthOf(date),
			day: Number(date.slice(8, 10)),
			account: (r[at.account] ?? '').trim(),
			description: (r[at.description] ?? '').replace(/\s+/g, ' ').trim(),
			amount,
			currency: (r[at.currency] ?? '').trim().toUpperCase(),
			category: UNCATEGORISED,
			source: 'none',
		});
	}
	return list;
}
