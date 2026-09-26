// One row from a myFinances combined CSV.
export interface Transaction {
	id: string;          // row id from combine.py
	date: string;        // YYYY-MM-DD
	month: string;       // YYYY-MM
	day: number;         // 1-31
	account: string;     // e.g. "barclays - debit"
	description: string;
	amount: number;      // money out is negative
	currency: string;    // e.g. "GBP"
	category: string;
	isTransfer: boolean; // move between your own accounts
}
