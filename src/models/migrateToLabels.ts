import { emptyLabels } from '../defaults/defaultLabels';
import { hashId } from '../utils/hashId';
import { findCategory } from './findCategory';
import type { Labels } from './Labels';
import type { Rule } from './Rule';
import { setLabel } from './setLabel';

// Settings saved before v3, when categories, rules and edits lived in data.json.
export interface OldSettings {
	version?: number;
	categories?: { name: string; kind: string }[];
	rules?: Rule[];
	edits?: Record<string, string>; // old key -> category
	details?: Record<string, { sub?: string; note?: string; other?: string }>;
}

// Old category -> [new category, subcategory].
const OLD_NAMES: Record<string, [string, string]> = {
	'Groceries': ['Food', 'Groceries'],
	'Eating out': ['Food', 'Eating out'],
	'General': ['General Spending', ''],
	'Other': ['General Spending', ''], // the old "Other" was spending
	'Refund': ['General Spending', 'Refund'],
	'Travel': ['General Spending', 'Travel'],
	'Fine': ['General Spending', 'Fine'],
	'Debt repay': ['General Spending', 'Debt repay'],
	'Mum support': ['Family', 'Mum'],
	'Family support': ['Other', ''],
	'Income': ['Other', ''],
	'Savings': ['Transfer', 'Savings'],
};

// Income that has its own category now, found by text in the description.
const PAYERS: [string, string][] = [['UNIV OF MANCHESTER', 'PhD'], ['STUDENTS U', 'UMSU']];

// Where other old categories go, by their old kind; the old name becomes the subcategory.
const BY_KIND: Record<string, string> = { spending: 'General Spending', income: 'Other', investment: 'Investment', transfer: 'Transfer' };

// Converts old settings: rules keep their order, edits and details merge into one label per transaction.
export function migrateToLabels(old: OldSettings): Labels {
	const labels = emptyLabels();
	for (const r of old.rules ?? []) {
		const [category, sub] = mapCategory(r.category, r.pattern, old);
		if (category) labels.rules.push({ ...r, category, subcategory: sub || r.subcategory || '' });
	}
	for (const [key, name] of Object.entries(old.edits ?? {})) {
		const [category, sub] = mapCategory(name, key, old);
		if (category) setLabel(labels, hashId(key), { category, sub });
	}
	for (const [key, d] of Object.entries(old.details ?? {})) setLabel(labels, hashId(key), d);
	return labels;
}

// Old category name -> [new category, subcategory]; '' = leave uncategorised. `text` finds income payers.
function mapCategory(name: string, text: string, old: OldSettings): [string, string] {
	const kind = old.categories?.find((c) => c.name === name)?.kind ?? '';
	const mapped: [string, string] = OLD_NAMES[name]
		?? (findCategory(name) ? [name, ''] : BY_KIND[kind] ? [BY_KIND[kind], name] : ['', '']);
	if (mapped[0] !== 'Other') return mapped;
	const payer = PAYERS.find(([p]) => text.toUpperCase().includes(p));
	return payer ? [payer[1], ''] : mapped;
}
