import type { Category, Subcategory } from './Category';
import type { Person } from './people';
import type { Rule } from './Rule';
import type { Subscription, SubscriptionType } from './Subscription';

// What you've set on one transaction. Empty fields are left out.
export interface Label {
	category?: string;     // one-off category; beats merchant rules
	sub?: string;          // subcategory; beats the rule's
	person?: string;       // under People: who; beats the rule's
	subscription?: string; // subscription set by hand, or NO_SUBSCRIPTION; empty = found automatically
	note?: string;
	tags?: string[];
	other?: string;        // transfers: the other account, set by hand
}

// One of your accounts. Accounts in the data appear by themselves; add others so transfers to them aren't "Unknown".
export interface Account {
	name: string;  // use the name myFinances will give it, so its statements link up later
	match: string; // text in a transfer's description that means this account, '' = none
}

// Your own data, saved in the database (see data/Database.ts).
// Keyed by the ids myFinances writes, so labels survive re-imports.
export interface Labels {
	categories: Category[];
	subcategories: Subcategory[];
	people: Person[];
	accounts: Account[];
	rules: Rule[];                       // merchant memory, first match wins
	types: SubscriptionType[];
	subscriptions: Subscription[];       // in the order shown
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

// Every tag used so far, A-Z (for suggestions).
export function tagNames(labels: Labels): string[] {
	const tags = new Set(Object.values(labels.transactions).flatMap((l) => l.tags ?? []));
	return [...tags].sort((a, b) => a.localeCompare(b));
}
