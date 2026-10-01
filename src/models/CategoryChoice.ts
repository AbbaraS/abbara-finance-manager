import type { CategoryKind } from './Category';
import type { Counterparty } from './Counterparty';
import type { Subscription } from './Subscription';

// Subscription choice values besides a name and NO_SUBSCRIPTION.
export const NEW_SUBSCRIPTION = '__new__';   // make a new one from `newSubscription`
export const KEEP_SUBSCRIPTION = '__keep__'; // several rows picked: leave theirs as they are

// Counterparty choice value: several rows picked, leave their hand-picked ones as they are.
export const KEEP_COUNTERPARTY = '__keep__';

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
	similar: boolean;             // true: remember for this counterparty (its spellings and category); false: one-off
	draft: Counterparty;          // the new counterparty, used when `similar` is on and `addTo` is empty
	addTo: Counterparty | null;   // add the spellings to this saved counterparty instead; it takes the chosen category
	counterparty: string;         // with `similar` off: picked by hand, '' = found by spellings, or KEEP_COUNTERPARTY
}
