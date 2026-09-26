// Which way the money moves ('' = either).
export type Direction = '' | 'in' | 'out';

// Puts matching transactions in a category. First match wins.
export interface Rule {
	pattern: string;      // text in the description, any case
	category: string;
	account: string;      // '' = any account
	direction: Direction;
}
