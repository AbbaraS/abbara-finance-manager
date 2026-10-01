import type { CategoryKind } from './Category';
import type { Rule } from './Rule';
import type { Subscription } from './Subscription';

// Subscription choice values besides a name and NO_SUBSCRIPTION.
export const NEW_SUBSCRIPTION = '__new__';   // make a new one from `newSubscription`
export const KEEP_SUBSCRIPTION = '__keep__'; // several rows picked: leave theirs as they are

// What the user picked in the edit-transaction window.
export interface CategoryChoice {
	category: string;
	newKind: CategoryKind | null; // set when making a new category
	subcategory: string;          // '' = none
	newSub: boolean;              // true while typing a new subcategory
	person: string;               // under People: who
	newPerson: boolean;           // true while typing a new person
	subscription: string;         // '' = found automatically, NO_SUBSCRIPTION, a name, NEW_ or KEEP_SUBSCRIPTION
	newSubscription: Subscription; // used with NEW_SUBSCRIPTION
	note: string;                 // only offered for one transaction
	tags: string[];               // one transaction: replaces its tags; several: added to theirs
	other: string;                // transfers: the other account, '' = find it
	similar: boolean;             // true: remember for this merchant (a rule); false: one-off
	rule: Rule;                   // used when `similar` is on
	addTo: Rule | null;           // add the patterns to this saved merchant instead of making a new one
}
