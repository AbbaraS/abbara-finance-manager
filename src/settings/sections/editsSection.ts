import { Setting } from 'obsidian';
import { setLabel } from '../../models/Labels';
import { countLabel } from '../../utils/countLabel';
import { dayLabel } from '../../utils/dates';
import { formatChange } from '../../utils/money';
import { confirmDelete } from '../confirmDelete';
import type { SettingsContext } from '../context';

// One-off categories (made with "Remember for this merchant" off), with undo per edit or all at once.
export function editsSection(el: HTMLElement, ctx: SettingsContext): void {
	const s = ctx.plugin.settings;
	const labels = ctx.plugin.db.labels;
	const byKey = new Map(ctx.rows.map((t) => [t.id, t]));
	const date = (id: string) => byKey.get(id)?.date ?? '';
	const keys = Object.keys(labels.transactions).filter((k) => labels.transactions[k].category)
		.sort((a, b) => date(b).localeCompare(date(a))); // newest first, missing rows last

	const heading = new Setting(el)
		.setName('One-off edits')
		.setDesc(`${countLabel(keys.length, 'edit')}. Removing one lets the merchants decide again.`)
		.setHeading();
	if (keys.length === 0) return;
	const undo = (key: string) => setLabel(labels, key, { category: '' }); // keeps subcategory and note
	confirmDelete(heading, 'Remove all one-off edits', () => {
		keys.forEach(undo);
		ctx.saveAndRedraw();
	});

	// Collapsed list, so it doesn't push the rest of the page down.
	const list = el.createEl('details', { cls: 'afm-edits' });
	list.createEl('summary', { text: `Show ${countLabel(keys.length, 'edit')}` });
	for (const key of keys) {
		const t = byKey.get(key);
		const to = labels.transactions[key].category;
		const desc = t ? `${dayLabel(t.date, s.locale)} ${t.date.slice(0, 4)} · ${t.account} · ${formatChange(t.amount, s)} → ${to}` : `No longer in the data → ${to}`;
		new Setting(list).setName(t ? t.description : key).setDesc(desc)
			.addExtraButton((b) => b.setIcon('undo-2').setTooltip('Remove edit').onClick(() => {
				undo(key);
				ctx.saveAndRedraw();
			}));
	}
}
