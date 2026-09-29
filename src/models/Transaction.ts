// Where a transaction's category came from.
export type CategorySource = 'edit' | 'rule' | 'none';

// One row from a myFinances combined CSV.
export interface Transaction {
	key: string;         // stable id for one-off edits, see transactionKeys.ts
	date: string;        // YYYY-MM-DD
	month: string;       // YYYY-MM
	day: number;         // 1-31
	account: string;     // e.g. "barclays - debit"
	description: string;
	amount: number;      // money out is negative
	currency: string;    // e.g. "GBP"
	category: string;    // set by categorise()
	source: CategorySource;
	subcategory: string; // '' = none
	note: string;
	otherAccount: string; // transfers: the other account if set by hand, '' = find it
}
