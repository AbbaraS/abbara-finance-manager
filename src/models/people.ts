import { setLabel, type Labels } from './Labels';

// Someone you send money to or get money from, listed under a People category.
export interface Person {
	id?: number;      // database id, empty until first saved
	name: string;
	category: string; // the People category they're under
	patterns?: string[]; // text in the description that means them, any case; checked before counterparties
}

// Finding, adding, moving, renaming and deleting people.

// People under a category, A-Z.
export function peopleIn(labels: Labels, category: string): string[] {
	return labels.people.filter((p) => p.category === category).map((p) => p.name).sort((a, b) => a.localeCompare(b));
}

// Adds a person under a People category, unless they're already listed.
export function addPerson(labels: Labels, name: string, category: string): void {
	if (name && !labels.people.some((p) => p.name === name)) labels.people.push({ name, category });
}

// Moves a person, with their subcategories, counterparties and one-off edits, to another People category.
export function movePerson(labels: Labels, name: string, category: string): void {
	for (const p of labels.people) if (p.name === name) p.category = category;
	for (const s of labels.subcategories) if (s.person === name) s.parent = category;
	for (const r of labels.counterparties) if (r.person === name) r.category = category;
	for (const l of Object.values(labels.transactions)) if (l.person === name && l.category) l.category = category;
}

// Renames a person everywhere: their subcategories, counterparties and labels.
export function renamePerson(labels: Labels, from: string, to: string): void {
	for (const p of labels.people) if (p.name === from) p.name = to;
	for (const s of labels.subcategories) if (s.person === from) s.person = to;
	for (const r of labels.counterparties) if (r.person === from) r.person = to;
	for (const l of Object.values(labels.transactions)) if (l.person === from) l.person = to;
}

// Deletes a person and their subcategories; their counterparties and labels keep the category but lose the person.
export function deletePerson(labels: Labels, name: string): void {
	labels.people = labels.people.filter((p) => p.name !== name);
	labels.subcategories = labels.subcategories.filter((s) => s.person !== name);
	for (const r of labels.counterparties) if (r.person === name) Object.assign(r, { person: '', subcategory: '' });
	for (const [id, l] of Object.entries(labels.transactions)) if (l.person === name) setLabel(labels, id, { person: '', sub: '' });
}
