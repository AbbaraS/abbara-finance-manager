import type { Category, Subcategory } from './Category';
import type { Person } from './people';
import type { Counterparty, Direction } from './Counterparty';
import type { Debt } from './debts';
import type { Subscription, SubscriptionType } from './Subscription';

// What you've set on one transaction. Empty fields are left out.
export interface Label {
	category?: string;     // one-off category; beats the counterparty's
	sub?: string;          // subcategory; beats the counterparty's
	person?: string;       // under People: who; beats the counterparty's
	subscription?: string; // subscription set by hand, or NO_SUBSCRIPTION; empty = found automatically
	note?: string;
	tags?: string[];
	other?: string;        // transfers: the other account, set by hand
	counterparty?: string; // picked by hand; empty = found by patterns
	notRefundOf?: string[]; // money in: ids of purchases it was unlinked from, so it isn't paired with them again
	backFor?: BackLink[];   // money in: purchases you linked it to (Mum paying you back for sandals)
}

// One purchase a payment pays back, and how much of the payment goes to it (positive).
export interface BackLink { purchase: string; amount: number }

// One of your accounts, in your order. Ones with statements come from myFinances; add others so transfers to them have a home.
export interface Account {
	id?: number;               // database id, empty until first saved
	name: string;              // shown everywhere; rename freely
	color: string;             // named colour or "#hex", '' = guessed from the name
	icon: string;              // Lucide icon name, '' = guessed from the name
	patterns: AccountPattern[]; // text that means a transaction is a transfer to/from this account
}

// Text in a description that points at one of your accounts (e.g. its sort code).
export interface AccountPattern {
	text: string;
	inAccount: string;   // only in this account's statements, '' = any
	direction: Direction; // '' = money in and out
}

// Your lists and decisions, saved in the database (see data/tables.ts).
// Keyed by the ids myFinances writes, so labels survive re-imports.
export interface Labels {
	categories: Category[];
	subcategories: Subcategory[];
	people: Person[];
	accounts: Account[];
	counterparties: Counterparty[];      // who transactions are with, first match wins
	types: SubscriptionType[];
	subscriptions: Subscription[];       // in the order shown
	transactions: Record<string, Label>; // transaction id -> label
	debts: Debt[];                       // what you owe people, added by hand or marked on transactions
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

// Every tag used so far on transactions, counterparties and subscriptions, A-Z (for suggestions).
export function tagNames(labels: Labels): string[] {
	const lists = [...Object.values(labels.transactions), ...labels.counterparties, ...labels.subscriptions].map((x) => x.tags ?? []);
	const tags = new Set(lists.flat());
	return [...tags].sort((a, b) => a.localeCompare(b));
}
