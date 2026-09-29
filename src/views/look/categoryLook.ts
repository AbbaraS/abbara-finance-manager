import { KIND_ICONS } from '../../models/Category';
import type { FinanceSettings } from '../../models/FinanceSettings';
import { colorCss } from './colorCss';

// Colour (CSS) and icon for a category name. Uncategorised and unknown names are grey.
export function categoryLook(name: string, s: FinanceSettings): { color: string; icon: string } {
	const c = s.categories.find((x) => x.name === name);
	if (!c) return { color: colorCss('gray'), icon: 'circle-help' };
	return { color: colorCss(c.color), icon: c.icon || KIND_ICONS[c.kind] };
}
