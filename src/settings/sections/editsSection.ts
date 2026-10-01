import { Setting } from 'obsidian';
import { setLabel } from '../../models/Labels';
import { countLabel } from '../../utils/countLabel';
import { dayLabel } from '../../utils/dates';
import { formatChange } from '../../utils/money';
import { collapsible } from '../collapsible';
import { confirmDelete } from '../confirmDelete';
import type { SettingsContext } from '../context';

// One-off categories (made with "Remember for this counterparty" off), with undo per edit or all at once.
export function editsSection(el: HTMLElement, ctx: SettingsContext): void {
	const s = ctx.plugin.settings;
	const labels = ctx.plugin.db.labels;
	const byKey = new Map(ctx.rows.map((t) => [t.id, t]));
	const date = (id: string) => byKey.get(id)?.date ?? '';
	const keys = Object.keys(labels.transactions).filter((k) => labels.transactions[k].category)
		.sort((a, b) => date(b).localeCompare(date(a))); // newest first, missing rows last

	const heading = new Setting(el)
		.setName('One-off edits')
		.setDesc(`${countLabel(keys.length, 'edit')}. Removing one lets its counterparty decide again.`)
		.setHeading();
	if (keys.length === 0) return;
	const undo = (key: string) => setLabel(labels, key, { category: '', sub: '', person: '' }); // keeps note and tags
	confirmDelete(heading, 'Remove all one-off edits', () => {
		keys.forEach(undo);
		ctx.saveAndRedraw();
	});

	// Collapsed list (stays open across redraws), so it doesn't push the rest of the page down.
	const list = collapsible(el, ctx, 'edits', '');
	const summary = list.querySelector('summary')!;
	let left = keys.length;
	const counts = () => {
		summary.setText(`Show ${countLabel(left, 'edit')}`);
		heading.setDesc(`${countLabel(left, 'edit')}. Removing one lets its counterparty decide again.`);
	};
	counts();

	for (const key of keys) {
		const t = byKey.get(key);
		const to = labels.transactions[key].category;
		const desc = t ? `${dayLabel(t.date, s.locale)} ${t.date.slice(0, 4)} · ${t.account} · ${formatChange(t.amount, s)} → ${to}` : `No longer in the data → ${to}`;
		const row = new Setting(list).setName(t ? t.description : key).setDesc(desc);
		// Removes just this row, without redrawing the tab, so the list stays open and in place.
		row.addExtraButton((b) => b.setIcon('undo-2').setTooltip('Remove edit').onClick(() => {
			undo(key);
			row.settingEl.remove();
			left--;
			if (left === 0) return ctx.saveAndRedraw();
			counts();
			ctx.save();
		}));
	}
}
