import { UNCATEGORISED } from '../models/rowKind';
import type { Transaction } from '../models/Transaction';
import { monthOf } from '../utils/dates';
import { parseCsv } from './parseCsv';

// Turns one monthly CSV into transactions (not yet categorised). Rows without an id, date or amount are skipped.
export function toTransactions(text: string): Transaction[] {
	const [header, ...rows] = parseCsv(text);
	if (!header) return [];
	const col = (name: string) => header.findIndex((h) => h.trim().toLowerCase() === name);
	const at = { id: col('id'), date: col('date'), account: col('account'), description: col('description'),
		amount: col('amount'), currency: col('currency') };

	const list: Transaction[] = [];
	for (const r of rows) {
		const date = (r[at.date] ?? '').trim().slice(0, 10);
		const amount = parseFloat(r[at.amount] ?? '');
		const id = (r[at.id] ?? '').trim();
		if (!id || !/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(amount)) continue;
		list.push({
			id,
			date,
			month: monthOf(date),
			day: Number(date.slice(8, 10)),
			account: (r[at.account] ?? '').trim(),
			description: (r[at.description] ?? '').replace(/\s+/g, ' ').trim(),
			amount,
			currency: (r[at.currency] ?? '').trim().toUpperCase(),
			category: UNCATEGORISED,
			kind: null,
			source: 'none',
			subcategory: '',
			note: '',
			tags: [],
			otherAccount: '',
			foundAccount: '',
			partner: null,
		});
	}
	return list;
}
