import { Setting } from 'obsidian';
import { countLabel } from '../../utils/countLabel';
import { dayLabel } from '../../utils/dates';
import { formatChange } from '../../utils/money';
import { confirmDelete } from '../confirmDelete';
import type { SettingsContext } from '../context';

// One-off category edits (made with "Apply to similar" off), with undo per edit or all at once.
export function editsSection(el: HTMLElement, ctx: SettingsContext): void {
	const s = ctx.plugin.settings;
	const keys = Object.keys(s.edits).sort().reverse(); // newest date first
	const heading = new Setting(el)
		.setName('One-off edits')
		.setDesc(`${countLabel(keys.length, 'edit')}. Removing one lets the rules decide again.`)
		.setHeading();
	if (keys.length === 0) return;
	confirmDelete(heading, 'Remove all one-off edits', () => {
		s.edits = {};
		ctx.saveAndRedraw();
	});

	// Collapsed list, so it doesn't push the rest of the page down.
	const list = el.createEl('details', { cls: 'afm-edits' });
	list.createEl('summary', { text: `Show ${countLabel(keys.length, 'edit')}` });
	const byKey = new Map(ctx.rows.map((t) => [t.key, t]));
	for (const key of keys) {
		const t = byKey.get(key);
		const name = t ? t.description : key;
		const desc = t ? `${dayLabel(t.date, s.locale)} ${t.date.slice(0, 4)} · ${t.account} · ${formatChange(t.amount, s)} → ${s.edits[key]}` : `No longer in the data → ${s.edits[key]}`;
		const row = new Setting(list).setName(name).setDesc(desc);
		row.addExtraButton((b) => b.setIcon('undo-2').setTooltip('Remove edit').onClick(() => {
			delete s.edits[key];
			ctx.saveAndRedraw();
		}));
	}
}
