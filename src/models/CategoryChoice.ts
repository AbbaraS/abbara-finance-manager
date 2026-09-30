import type { Rule } from './Rule';

// What the user picked in the edit-transaction window.
export interface CategoryChoice {
	category: string;    // one of the fixed categories
	subcategory: string; // '' = none
	note: string;        // only offered for one transaction
	other: string;       // transfers: the other account, '' = find it
	similar: boolean;    // true: remember for this merchant (a rule); false: one-off
	rule: Rule;          // used when `similar` is on
}
