import type { Rule } from './Rule';

// What you've set on one transaction. Empty fields are left out.
export interface Label {
	category?: string; // one-off category; beats merchant rules
	sub?: string;      // subcategory; beats the rule's
	note?: string;     // free comment
	other?: string;    // transfers: the other account (when it can't be found)
}

// Your own data, saved as JSON in the vault (settings: labelsFile).
export interface Labels {
	version: number;
	transactions: Record<string, Label>; // transaction id -> label
	rules: Rule[];                        // merchant memory, first match wins
}
