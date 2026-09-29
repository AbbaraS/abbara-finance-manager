import { setIconSafe } from './setIconSafe';
import type { FinanceSettings } from '../../models/FinanceSettings';
import { categoryLook } from './categoryLook';

// A coloured category badge (icon, name, optional subcategory), in the style of Custom Badges.
// `tag` 'button' makes it clickable; the caller adds the click handler.
export function badge(parent: HTMLElement, category: string, s: FinanceSettings, sub = '', tag: 'span' | 'button' = 'span'): HTMLElement {
	const look = categoryLook(category, s);
	const el = parent.createEl(tag, { cls: 'afm-badge' });
	el.setCssProps({ '--afm-cat': look.color });
	setIconSafe(el.createSpan({ cls: 'afm-badge-icon' }), look.icon);
	el.createSpan({ cls: 'afm-badge-label', text: category });
	if (sub) el.createSpan({ cls: 'afm-badge-sub', text: sub });
	return el;
}
