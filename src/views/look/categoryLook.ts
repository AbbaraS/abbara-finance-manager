import { findCategory } from '../../models/categories';
import type { Labels } from '../../models/Labels';
import { colorCss } from './colorCss';

// Colour (CSS) and icon for a category name. Uncategorised and unknown names are grey.
export function categoryLook(name: string, labels: Labels): { color: string; icon: string } {
	const c = findCategory(labels, name);
	if (!c) return { color: colorCss('gray'), icon: 'circle-help' };
	return { color: colorCss(c.color), icon: c.icon };
}

// A person's colour (CSS): their own, else their People category's.
export function personColor(name: string, labels: Labels): string {
	const p = labels.people.find((x) => x.name === name);
	return p?.color ? colorCss(p.color) : categoryLook(p?.category ?? '', labels).color;
}
