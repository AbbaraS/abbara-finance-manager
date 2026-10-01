// Which way the money moves ('' = either).
export type Direction = '' | 'in' | 'out';

// Puts matching transactions in a category. First match wins.
export interface Rule {
	patterns: string[];   // text in the description, any case; any one matches (e.g. "UBER", "UBR")
	category: string;
	subcategory?: string; // optional, e.g. "Gold" under Investment
	person?: string;      // under People: who, e.g. "Mum"
	account: string;      // '' = any account
	direction: Direction;
}
