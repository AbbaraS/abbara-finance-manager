import type { CategoryKind } from './Category';
import type { Rule } from './Rule';

// What the user picked in the edit-transaction window.
export interface CategoryChoice {
	category: string;
	newKind: CategoryKind | null; // set when making a new category
	subcategory: string;          // '' = none
	newSub: boolean;              // true while typing a new subcategory
	note: string;                 // only offered for one transaction
	tags: string[];               // one transaction: replaces its tags; several: added to theirs
	other: string;                // transfers: the other account, '' = find it
	similar: boolean;             // true: remember for this merchant (a rule); false: one-off
	rule: Rule;                   // used when `similar` is on
}
