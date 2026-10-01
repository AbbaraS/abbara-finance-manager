import type { Counterparty } from './Counterparty';
import { counterpartyMatches } from './counterpartyMatches';
import type { Transaction } from './Transaction';

// What a new or changed counterparty would touch.
export interface CounterpartyPreview {
	count: number;  // rows it matches
	months: number; // months those rows are in
	edited: number; // of those, rows with a one-off edit (they keep it)
}

// Counts the rows a counterparty matches. `picked` rows lose their edit, so they aren't counted as edited.
export function counterpartyPreview(cp: Counterparty, rows: Transaction[], picked: Transaction[]): CounterpartyPreview {
	const pickedKeys = new Set(picked.map((t) => t.id));
	const hits = rows.filter((t) => counterpartyMatches(cp, t));
	return {
		count: hits.length,
		months: new Set(hits.map((t) => t.month)).size,
		edited: hits.filter((t) => t.source === 'edit' && !pickedKeys.has(t.id)).length,
	};
}
