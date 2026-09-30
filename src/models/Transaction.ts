import type { CategoryKind } from './Category';

// Where a transaction's category came from.
export type CategorySource = 'edit' | 'rule' | 'pair' | 'none'; // pair: other side of a transfer

// One row from a myFinances monthly CSV, with your labels applied (see categorise).
export interface Transaction {
	id: string;          // made by myFinances; your labels are saved against it
	date: string;        // YYYY-MM-DD
	month: string;       // YYYY-MM
	day: number;         // 1-31
	account: string;     // e.g. "barclays - debit"
	description: string;
	amount: number;      // money out is negative
	currency: string;    // e.g. "GBP"
	category: string;    // set by categorise()
	kind: CategoryKind | null; // the category's kind, null = uncategorised
	source: CategorySource;
	subcategory: string; // '' = none; money in under Spending shows "Refund"
	note: string;
	tags: string[];
	otherAccount: string; // transfers: the other account if set by hand, '' = find it
	foundAccount: string; // transfers: the other account used (by hand or found), '' = not a transfer
	partner: Transaction | null; // transfers: the matching row in the other account
}
