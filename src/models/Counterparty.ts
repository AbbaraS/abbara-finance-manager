// Which way the money moves ('' = either).
export type Direction = '' | 'in' | 'out';

// Who a transaction is with (a shop, service, employer), found by text in the description. First match wins.
// With a category, its transactions get that category too; one-off edits beat it.
export interface Counterparty {
	id?: number;          // database id, empty until first saved
	name: string;         // e.g. "Uber", shown instead of the description; unique
	patterns: string[];   // text in the description, any case; any one matches (e.g. "UBER", "UBR")
	category: string;     // '' = names it only
	subcategory?: string; // optional, e.g. "Taxi" under Transport
	person?: string;      // under People: who, e.g. "Mum"
	account: string;      // '' = any account
	direction: Direction;
}
