import type { Category } from './Category';
import type { Rule } from './Rule';

// What you've set on one transaction. Empty fields are left out.
export interface Label {
	category?: string; // one-off category; beats merchant rules
	sub?: string;      // subcategory (the person, under People); beats the rule's
	note?: string;
	tags?: string[];
	other?: string;    // transfers: the other account, set by hand
}

// One of your accounts. Accounts in the data appear by themselves; add others so transfers to them aren't "Unknown".
export interface Account {
	name: string;  // use the name myFinances will give it, so its statements link up later
	match: string; // text in a transfer's description that means this account, '' = none
}

// Your own data, saved as JSON in the vault (setting: labelsFile).
// Keyed by the ids myFinances writes, so the file can be copied to another vault.
export interface Labels {
	version: number;
	categories: Category[];
	accounts: Account[];
	rules: Rule[];                       // merchant memory, first match wins
	transactions: Record<string, Label>; // transaction id -> label
}

// Merges changes into one transaction's label; empty values are removed, and so is an empty label.
export function setLabel(labels: Labels, id: string, patch: Label): void {
	const l: Label = { ...labels.transactions[id], ...patch };
	for (const k of Object.keys(l) as (keyof Label)[]) {
		const v = l[k];
		if (v === undefined || (typeof v === 'string' ? !v.trim() : v.length === 0)) delete l[k];
	}
	if (Object.keys(l).length === 0) delete labels.transactions[id];
	else labels.transactions[id] = l;
}
