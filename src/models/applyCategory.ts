import { addCategory, addSubcategory, findCategory } from './categories';
import { KEEP_COUNTERPARTY, KEEP_SUBSCRIPTION, NEW_SUBSCRIPTION, type CategoryChoice } from './CategoryChoice';
import { uniqueName } from './counterparties';
import type { Counterparty } from './Counterparty';
import { cleanPatterns, counterpartyMatches } from './counterpartyMatches';
import { setLabel, type Labels } from './Labels';
import { addPerson } from './people';
import { REFUND } from './categorise';
import { addSubscription } from './subscriptions';
import type { Transaction } from './Transaction';

// Saves a choice into your labels: a new category, person, subcategory or subscription if needed, a counterparty
// (new, or added to a saved one) or one-off categories, then subcategory, person, counterparty, subscription, note and tags.
export function applyCategory(labels: Labels, picked: Transaction[], c: CategoryChoice): void {
	const name = c.category.trim();
	const sub = c.subcategory.trim() === REFUND ? '' : c.subcategory.trim(); // Refund is only shown
	if (c.newKind) addCategory(labels, name, c.newKind);
	const kind = findCategory(labels, name)?.kind;
	const person = kind === 'people' ? c.person.trim() : '';
	addPerson(labels, person, name);
	addSubcategory(labels, name, sub, person);

	// Subscription: a new one is saved first.
	const n = c.newSubscription;
	if (c.subscription === NEW_SUBSCRIPTION) addSubscription(labels, { ...n, name: n.name.trim(), match: n.match.trim() });
	const subscription = c.subscription === NEW_SUBSCRIPTION ? n.name.trim() : c.subscription;

	// Counterparty: it decides a row when it's the first whose spellings find it.
	const cp = c.similar ? counterpartyFor(labels, c, name, sub, person) : null;
	const decides = (t: Transaction) => cp !== null && labels.counterparties.find((x) => counterpartyMatches(x, t)) === cp;
	const handPick = (t: Transaction) => (cp ? (decides(t) ? '' : cp.name) // rows it misses are linked by hand
		: c.counterparty === KEEP_COUNTERPARTY ? labels.transactions[t.id]?.counterparty ?? '' : c.counterparty);

	const one = picked.length === 1;
	for (const t of picked) {
		// Where the row lands. A one-off edit saves category, subcategory and person together; none is needed when the
		// row's counterparty already gives exactly this, and rows already here (not by an edit) are left as they are.
		const linked = handPick(t);
		const home = (linked ? labels.counterparties.find((x) => x.name === linked) : undefined) ?? labels.counterparties.find((x) => counterpartyMatches(x, t));
		const given = home?.category === name && (home.subcategory ?? '') === sub && (home.person ?? '') === person;
		const here = t.category === name && (t.subcategory === REFUND ? '' : t.subcategory) === sub && t.person === person && t.source !== 'edit';
		const place = given ? { category: '', sub: '', person: '' } : here ? {} : { category: name, sub, person };
		const tags = one ? c.tags : [...new Set([...t.tags, ...c.tags])];
		setLabel(labels, t.id, {
			...place,
			other: kind === 'transfer' ? c.other : '', // other account only means something for transfers
			counterparty: handPick(t),
			tags,
			...(subscription === KEEP_SUBSCRIPTION ? {} : { subscription }),
			...(one ? { note: c.note } : {}),
		});
	}
}

// The picked counterparty (or a saved one with the same spellings) gets the new spellings and the category;
// otherwise a new one is saved first in the list.
function counterpartyFor(labels: Labels, c: CategoryChoice, name: string, sub: string, person: string): Counterparty {
	const draft = { ...c.draft, patterns: cleanPatterns(c.draft.patterns) };
	const saved = c.addTo && labels.counterparties.includes(c.addTo) ? c.addTo : labels.counterparties.find((x) => sameMatch(x, draft));
	if (saved) {
		Object.assign(saved, { patterns: cleanPatterns([...saved.patterns, ...draft.patterns]), category: name, subcategory: sub, person });
		return saved;
	}
	const cp: Counterparty = { ...draft, name: uniqueName(labels, draft.name), category: name, subcategory: sub, person };
	labels.counterparties.unshift(cp);
	return cp;
}

// True when two counterparties find exactly the same rows.
function sameMatch(a: Counterparty, b: Counterparty): boolean {
	const key = (x: Counterparty) => cleanPatterns(x.patterns).map((p) => p.toLowerCase()).sort().join('\n');
	return key(a) === key(b) && a.account === b.account && a.direction === b.direction;
}
