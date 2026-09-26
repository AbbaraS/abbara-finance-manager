import type { Transaction } from '../models/Transaction';
import { monthOf } from '../utils/dates';
import { parseCsv } from './parseCsv';

// Turns one combined CSV into transactions. Bad rows are skipped.
export function toTransactions(text: string): Transaction[] {
	const [header, ...rows] = parseCsv(text);
	if (!header) return [];
	const col = (name: string) => header.findIndex((h) => h.trim().toLowerCase() === name);
	const at = { id: col('id'), date: col('date'), account: col('account'), description: col('description'),
		amount: col('amount'), currency: col('currency'), category: col('category'), transfer: col('is_transfer') };

	const list: Transaction[] = [];
	for (const r of rows) {
		const date = (r[at.date] ?? '').trim().slice(0, 10);
		const amount = parseFloat(r[at.amount] ?? '');
		if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(amount)) continue;
		list.push({
			id: r[at.id] ?? '',
			date,
			month: monthOf(date),
			day: Number(date.slice(8, 10)),
			account: r[at.account] ?? '',
			description: r[at.description] ?? '',
			amount,
			currency: (r[at.currency] ?? '').trim().toUpperCase(),
			category: r[at.category] || 'Uncategorised',
			isTransfer: (r[at.transfer] ?? '').trim().toLowerCase() === 'true',
		});
	}
	return list;
}
