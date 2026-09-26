import type { CategoryKind } from './Category';
import type { Rule } from './Rule';

// What the user picked in the change-category window.
export interface CategoryChoice {
	category: string;
	newKind: CategoryKind | null; // set when the category is new
	similar: boolean;             // true: save a rule; false: one-off edits
	rule: Rule;                   // used when `similar` is on
}
