import { findCategory } from '../../models/findCategory';
import { colorCss } from './colorCss';

// Colour (CSS) and icon for a category name. Uncategorised and unknown names are grey.
export function categoryLook(name: string): { color: string; icon: string } {
	const c = findCategory(name);
	if (!c) return { color: colorCss('gray'), icon: 'circle-help' };
	return { color: colorCss(c.color), icon: c.icon };
}
