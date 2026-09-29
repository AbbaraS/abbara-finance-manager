import type { CategoryKind } from './Category';
import type { Rule } from './Rule';

// What the user picked in the edit-transaction window.
export interface CategoryChoice {
	category: string;
	newKind: CategoryKind | null; // set when the category is new
	subcategory: string;          // '' = none
	note: string;                 // only offered for one transaction
	other: string;                // transfers: the other account, '' = find it
	similar: boolean;             // true: save a rule; false: one-off edits
	rule: Rule;                   // used when `similar` is on
}
