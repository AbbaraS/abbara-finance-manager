import type { Labels } from '../../models/Labels';
import { categoryLook } from './categoryLook';
import { setIconSafe } from './setIconSafe';

// A coloured category badge (icon, name, optional subcategory), in the style of Custom Badges.
// With an amount it ends in an arrow: ↙ money in, ↗ money out. `tag` 'button' makes it clickable.
export function badge(parent: HTMLElement, category: string, labels: Labels, sub = '', tag: 'span' | 'button' = 'span', amount = 0): HTMLElement {
	const look = categoryLook(category, labels);
	const el = parent.createEl(tag, { cls: 'afm-badge' });
	el.setCssProps({ '--afm-cat': look.color });
	setIconSafe(el.createSpan({ cls: 'afm-badge-icon' }), look.icon);
	el.createSpan({ cls: 'afm-badge-label', text: category });
	if (sub) el.createSpan({ cls: 'afm-badge-sub', text: sub });
	if (amount !== 0) {
		const dir = el.createSpan({ cls: `afm-badge-dir ${amount > 0 ? 'is-in' : 'is-out'}`, attr: { 'aria-label': amount > 0 ? 'Money in' : 'Money out' } });
		setIconSafe(dir, amount > 0 ? 'arrow-down-left' : 'arrow-up-right');
	}
	return el;
}
