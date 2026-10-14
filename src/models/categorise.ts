import type { Counterparty } from './Counterparty';
import type { Labels } from './Labels';
import type { Transaction } from './Transaction';
import type { Person } from './people';
import { counterpartyMatches, textMatches } from './counterpartyMatches';

// Subcategory shown for money in under a Spending category.
export const REFUND = 'Refund';

// Who a row is with (as the edit window guesses it; Python's rules decide for real): a counterparty picked by hand, else a person whose spellings match, else the first matching counterparty.
export function whoFor(labels: Labels, t: Transaction, picked = labels.transactions[t.id]?.counterparty ?? ''): { cp?: Counterparty; person?: Person } {
	const hand = picked ? labels.counterparties.find((x) => x.name === picked) : undefined;
	if (hand) return { cp: hand };
	const person = labels.people.find((p) => textMatches(p.patterns ?? [], t.description));
	return person ? { person } : { cp: labels.counterparties.find((x) => counterpartyMatches(x, t)) };
}
