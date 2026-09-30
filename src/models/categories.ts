import { KIND_ICONS, type Category, type CategoryKind } from './Category';
import { COLOR_NAMES } from './colors';
import { setLabel, type Labels } from './Labels';

// Finding, adding, renaming and deleting categories in your labels.

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
	for (const r of labels.rules) if (r.category === from) r.category = to;
	for (const l of Object.values(labels.transactions)) if (l.category === from) l.category = to;
}

// Deletes a category with its merchant rules and one-off edits (and their subcategories); those rows fall back to other rules.
export function deleteCategory(labels: Labels, name: string): void {
	labels.categories = labels.categories.filter((c) => c.name !== name);
	labels.rules = labels.rules.filter((r) => r.category !== name);
	for (const [id, l] of Object.entries(labels.transactions)) if (l.category === name) setLabel(labels, id, { category: '', sub: '' });
}
