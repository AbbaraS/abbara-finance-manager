import type { CategoryKind } from './Category';
import type { Debt } from './debts';
import { fullyRefunded } from './linkRefunds';

// Where a transaction's category came from.
export type CategorySource = 'edit' | 'rule' | 'person' | 'pair' | 'refund' | 'none'; // rule: the counterparty's category; person: found by a person's spellings; pair: other side of a transfer; refund: its purchase's category

// One transaction from the database, with your labels applied (see categorise).
export interface Transaction {
	id: string;          // made by myFinances; your labels are saved against it
	date: string;        // YYYY-MM-DD
	month: string;       // YYYY-MM
	day: number;         // 1-31
	account: string;     // e.g. "barclays - debit"
	description: string;
	counterparty: string; // name, '' = none (set by categorise)
	amount: number;      // money out is negative
	currency: string;    // e.g. "GBP"
	category: string;    // set by categorise()
	kind: CategoryKind | null; // the category's kind, null = uncategorised
	source: CategorySource;
	subcategory: string; // '' = none; money in under Spending shows "Refund"
	person: string;      // under People: who, '' = none
	subscription: string; // subscription name, '' = none (see linkSubscriptions)
	payment: number;     // which payment of the subscription this is (5 of 10), 0 = not numbered
	note: string;
	tags: string[];      // set on this transaction
	autoTags: string[];  // from its counterparty and subscription (see categorise)
	otherAccount: string; // transfers: the other account if set by hand, '' = find it
	foundAccount: string; // transfers: the other account used (by hand or found), '' = not a transfer
	partner: Transaction | null; // transfers: the matching row in the other account
	refundOf: Transaction | null; // money back: the (first) purchase it gives back for (see linkRefunds)
	refunds: RefundPart[];        // purchases: money back for it, from the shop or from a person
	givenBack: number;            // money back: how much of it goes to purchases (positive), 0 = none
	spendMonth: string;           // the month it counts in: money back in its purchase's month, else its own
	debt: Debt | null;            // its entry in what you owe a person, when marked as a debt
}

// Money back for a purchase: the row it came in on and how much of it goes to this purchase (positive).
export interface RefundPart { t: Transaction; amount: number }

// Newest first, fully refunded purchases last. Rows on the same day: latest in the statement first.
export function newestFirst(rows: Transaction[]): Transaction[] {
	return rows.map((t, i) => ({ t, i }))
		.sort((a, b) => Number(fullyRefunded(a.t)) - Number(fullyRefunded(b.t)) || b.t.date.localeCompare(a.t.date) || b.i - a.i)
		.map((x) => x.t);
}
