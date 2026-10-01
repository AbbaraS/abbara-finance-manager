import { REFUND } from './categorise';
import { KIND_ICONS, type Category, type CategoryKind, type Subcategory } from './Category';
import { COLOR_NAMES } from './colors';
import { setLabel, type Labels } from './Labels';
import { addPerson } from './people';
import type { Transaction } from './Transaction';

// Finding, adding, renaming and deleting categories and subcategories in your labels.

// A category by name; undefined for Uncategorised or unknown names.
export function findCategory(labels: Labels, name: string): Category | undefined {
	return labels.categories.find((c) => c.name === name);
}

// Adds a category with its kind's icon and the colour fewest categories use.
export function addCategory(labels: Labels, name: string, kind: CategoryKind): void {
	if (findCategory(labels, name)) return;
	const used = (color: string) => labels.categories.filter((c) => c.color === color).length;
	const color = COLOR_NAMES.filter((n) => n !== 'gray').sort((a, b) => used(a) - used(b))[0];
	labels.categories.push({ name, kind, color, icon: KIND_ICONS[kind] });
}

// Renames a category everywhere it's used.
export function renameCategory(labels: Labels, from: string, to: string): void {
	for (const c of labels.categories) if (c.name === from) c.name = to;
	for (const s of labels.subcategories) if (s.parent === from) s.parent = to;
	for (const p of labels.people) if (p.category === from) p.category = to;
	for (const r of labels.counterparties) if (r.category === from) r.category = to;
	for (const l of Object.values(labels.transactions)) if (l.category === from) l.category = to;
}

// Deletes a category with its subcategories, people and one-off edits; its counterparties stay, without a category.
export function deleteCategory(labels: Labels, name: string): void {
	const people = new Set(labels.people.filter((p) => p.category === name).map((p) => p.name));
	labels.categories = labels.categories.filter((c) => c.name !== name);
	labels.subcategories = labels.subcategories.filter((s) => s.parent !== name);
	labels.people = labels.people.filter((p) => p.category !== name);
	for (const r of labels.counterparties) if (r.category === name) Object.assign(r, { category: '', subcategory: '', person: '' });
	for (const [id, l] of Object.entries(labels.transactions)) {
		if (l.category === name || people.has(l.person ?? '')) setLabel(labels, id, { category: '', sub: '', person: '' });
	}
}

// A category's subcategories (a person's own under People), A-Z.
export function subcategoriesOf(labels: Labels, category: string, person = ''): Subcategory[] {
	return labels.subcategories.filter((s) => s.parent === category && s.person === person).sort((a, b) => a.name.localeCompare(b.name));
}

// Adds a subcategory unless it's already there.
export function addSubcategory(labels: Labels, parent: string, name: string, person = ''): void {
	if (!name || subcategoriesOf(labels, parent, person).some((s) => s.name === name)) return;
	labels.subcategories.push({ name, parent, person });
}

// Renames a subcategory on its counterparties and labels too.
export function renameSubcategory(labels: Labels, s: Subcategory, to: string): void {
	for (const r of labels.counterparties) if (r.category === s.parent && (r.person ?? '') === s.person && r.subcategory === s.name) r.subcategory = to;
	for (const l of Object.values(labels.transactions)) if (usesSub(l, s)) l.sub = to;
	s.name = to;
}

// Deletes a subcategory; its counterparties and labels keep their category.
export function deleteSubcategory(labels: Labels, s: Subcategory): void {
	labels.subcategories = labels.subcategories.filter((x) => x !== s);
	for (const r of labels.counterparties) if (r.category === s.parent && (r.person ?? '') === s.person && r.subcategory === s.name) r.subcategory = '';
	for (const [id, l] of Object.entries(labels.transactions)) if (usesSub(l, s)) setLabel(labels, id, { sub: '' });
}

// True when a label's subcategory is this one (a label without a category takes its counterparty's).
function usesSub(l: { category?: string; sub?: string; person?: string }, s: Subcategory): boolean {
	return l.sub === s.name && (!l.category || l.category === s.parent) && (!l.person || l.person === s.person);
}

// Adds subcategories and people that counterparties, labels or rows use but the lists don't have yet,
// and drops ones whose category or person is gone. Returns true when the lists changed.
export function syncLists(labels: Labels, rows: Transaction[]): boolean {
	const before = JSON.stringify([labels.subcategories, labels.people]);
	const kinds = new Map(labels.categories.map((c) => [c.name, c.kind]));
	labels.people = labels.people.filter((p) => kinds.get(p.category) === 'people');
	labels.subcategories = labels.subcategories.filter((s) => kinds.has(s.parent) && (!s.person || labels.people.some((p) => p.name === s.person)));

	const use = (category: string, sub = '', person = '') => {
		if (!kinds.has(category)) return;
		const who = kinds.get(category) === 'people' ? person : '';
		if (who) addPerson(labels, who, category);
		if (sub && sub !== REFUND) addSubcategory(labels, category, sub, who); // Refund is only shown, not saved
	};
	for (const r of labels.counterparties) if (r.category) use(r.category, r.subcategory, r.person);
	for (const l of Object.values(labels.transactions)) if (l.category) use(l.category, l.sub, l.person);
	for (const t of rows) use(t.category, t.subcategory, t.person);
	return JSON.stringify([labels.subcategories, labels.people]) !== before;
}
