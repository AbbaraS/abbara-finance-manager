import { addCategory, findCategory, subcategoriesOf, addSubcategory } from './categories';
import type { CategoryKind, Subcategory } from './Category';
import { categorise, REFUND } from './categorise';
import { setLabel, type Labels } from './Labels';
import type { Transaction } from './Transaction';

// Moving and merging categories and subcategories (not People ones), taking their transactions and counterparties along.

// A place transactions can be in: a category, and a subcategory under it ('' = none).
export interface Place {
	category: string;
	sub: string;
}

// One place to pick in a dropdown.
export interface PlaceChoice {
	label: string;
	place: Place | null; // null = Uncategorised
}

// Places to move to: each category (not People) and its subcategories, and with `name`, a new subcategory of that name
// where there isn't one yet. `skip` leaves out a whole category (no sub) or one subcategory.
export function placeChoices(labels: Labels, skip: Place, name = ''): PlaceChoice[] {
	const out: PlaceChoice[] = [];
	for (const c of labels.categories) {
		if (c.kind === 'people' || (c.name === skip.category && !skip.sub)) continue;
		const subs = subcategoriesOf(labels, c.name);
		out.push({ label: c.name, place: { category: c.name, sub: '' } });
		for (const s of subs) {
			if (c.name !== skip.category || s.name !== skip.sub) out.push({ label: `${c.name} › ${s.name}`, place: { category: c.name, sub: s.name } });
		}
		if (name && !subs.some((s) => s.name === name)) out.push({ label: `${c.name} › ${name} (new)`, place: { category: c.name, sub: name } });
	}
	return out;
}

// Moves a subcategory's transactions and counterparties to `to`, then removes it. A `to` category that doesn't exist yet
// is made, with the old parent's kind (this turns a subcategory into a category).
export function moveSubcategory(labels: Labels, raw: Transaction[], s: Subcategory, to: Place): void {
	makePlace(labels, to, findCategory(labels, s.parent)?.kind ?? 'spending');
	moveRows(labels, raw, (p) => (p.category === s.parent && p.sub === s.name ? to : undefined));
	labels.subcategories = labels.subcategories.filter((x) => x !== s);
}

// Moves a category's transactions and counterparties to `to`, then removes it with its subcategories.
// With `keepSubs`, its subcategories move to `to`'s category too; otherwise everything lands on `to`.
export function moveCategory(labels: Labels, raw: Transaction[], name: string, to: Place, keepSubs: boolean): void {
	makePlace(labels, to, findCategory(labels, name)?.kind ?? 'spending');
	if (keepSubs) for (const s of subcategoriesOf(labels, name)) addSubcategory(labels, to.category, s.name);
	moveRows(labels, raw, (p) => (p.category === name ? { category: to.category, sub: keepSubs && p.sub ? p.sub : to.sub } : undefined));
	labels.categories = labels.categories.filter((c) => c.name !== name);
	labels.subcategories = labels.subcategories.filter((s) => s.parent !== name);
}

// Makes the category and subcategory of a place if they're missing.
function makePlace(labels: Labels, to: Place, kind: CategoryKind): void {
	if (!findCategory(labels, to.category)) addCategory(labels, to.category, kind);
	if (to.sub) addSubcategory(labels, to.category, to.sub);
}

// Moves rows to the place `map` gives (undefined = leave), by rewriting counterparties and one-off edits.
// Rows those don't carry over (e.g. a subcategory set on a counterparty's row) get a one-off edit.
function moveRows(labels: Labels, raw: Transaction[], map: (p: Place) => Place | undefined): void {
	const placeOf = (t: Transaction): Place => ({ category: t.category, sub: t.subcategory === REFUND ? '' : t.subcategory });
	const want = new Map<string, Place>();
	for (const t of categorise(raw, labels)) {
		const to = map(placeOf(t));
		if (to) want.set(t.id, to);
	}

	for (const r of labels.counterparties) {
		const to = r.category ? map({ category: r.category, sub: r.subcategory ?? '' }) : undefined;
		if (to) Object.assign(r, { category: to.category, subcategory: to.sub, person: '' });
	}
	for (const [id, l] of Object.entries(labels.transactions)) {
		const to = l.category ? map({ category: l.category, sub: l.sub ?? '' }) : undefined;
		if (to) setLabel(labels, id, { category: to.category, sub: to.sub, person: '' });
	}

	for (const t of categorise(raw, labels)) {
		const to = want.get(t.id);
		const now = placeOf(t);
		if (to && (now.category !== to.category || now.sub !== to.sub)) setLabel(labels, t.id, { category: to.category, sub: to.sub, person: '' });
	}
}
