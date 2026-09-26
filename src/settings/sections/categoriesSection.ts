import { Notice, Setting } from 'obsidian';
import { KIND_LABELS, type Category, type CategoryKind } from '../../models/Category';
import { categoryUsage } from '../../models/categoryUsage';
import { deleteCategory } from '../../models/deleteCategory';
import { renameCategory } from '../../models/renameCategory';
import { countLabel } from '../../utils/countLabel';
import { confirmDelete } from '../confirmDelete';
import type { SettingsContext } from '../context';

// Your categories: rename, choose how each counts, delete, or add new ones.
export function categoriesSection(el: HTMLElement, ctx: SettingsContext): void {
	const s = ctx.plugin.settings;
	new Setting(el)
		.setName('Categories')
		.setDesc('Spending: money out is spent, money in is a refund. Income: money in on an income account. Not counted: transfers, savings and other money left out of totals.')
		.setHeading();

	// Grouped by kind, then A-Z.
	const order = Object.keys(KIND_LABELS);
	const sorted = [...s.categories].sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind) || a.name.localeCompare(b.name));
	for (const c of sorted) categoryRow(el, c, ctx);

	// Add.
	let name = '';
	new Setting(el)
		.addText((t) => t.setPlaceholder('New category').onChange((v) => (name = v.trim())))
		.addButton((b) => b.setButtonText('Add').onClick(() => {
			if (!name) return;
			if (s.categories.some((c) => c.name === name)) return void new Notice(`"${name}" already exists.`);
			s.categories.push({ name, kind: 'spending' });
			ctx.saveAndRedraw();
		}));
}

// One category: name (renames on blur), kind dropdown, delete.
function categoryRow(el: HTMLElement, c: Category, ctx: SettingsContext): void {
	const s = ctx.plugin.settings;
	const use = categoryUsage(c.name, s, ctx.rows);
	const setting = new Setting(el)
		.setDesc(`${countLabel(use.rows)} · ${countLabel(use.rules, 'rule')} · ${countLabel(use.edits, 'one-off edit')}`)
		.addText((t) => {
			t.setValue(c.name);
			t.inputEl.addEventListener('change', () => {
				const to = t.getValue().trim();
				if (!to || to === c.name) return t.setValue(c.name);
				if (s.categories.some((x) => x.name === to)) { new Notice(`"${to}" already exists.`); return t.setValue(c.name); }
				renameCategory(s, c.name, to);
				ctx.saveAndRedraw();
			});
		})
		.addDropdown((d) => d.addOptions(KIND_LABELS).setValue(c.kind)
			.onChange((v) => { c.kind = v as CategoryKind; ctx.save(); }));
	confirmDelete(setting, 'Delete category, its rules and edits', () => {
		deleteCategory(s, c.name);
		ctx.saveAndRedraw();
	});
}
