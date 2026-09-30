import { Notice, Setting } from 'obsidian';
import { addCategory, deleteCategory, renameCategory } from '../../models/categories';
import { KIND_LABELS, type CategoryKind } from '../../models/Category';
import { COLOR_NAMES } from '../../models/colors';
import { countLabel } from '../../utils/countLabel';
import { badge } from '../../views/look/badge';
import { confirmDelete } from '../confirmDelete';
import type { SettingsContext } from '../context';

// Your categories, grouped by kind: rename, colour, kind, delete; add new ones at the end.
export function categoriesSection(el: HTMLElement, ctx: SettingsContext): void {
	const labels = ctx.plugin.labels.data;
	new Setting(el)
		.setName('Categories')
		.setDesc('Spending and People: money out is spent, money in is a refund. Income: money in is income. Transfers and Savings: not counted. Subcategories are made in the edit window.')
		.setHeading();

	const kinds = Object.keys(KIND_LABELS) as CategoryKind[];
	const sorted = [...labels.categories].sort((a, b) => kinds.indexOf(a.kind) - kinds.indexOf(b.kind));
	for (const c of sorted) {
		const used = ctx.rows.filter((t) => t.category === c.name).length;
		const row = new Setting(el).setClass('afm-wrap').setDesc(`${KIND_LABELS[c.kind]} · ${countLabel(used)}`);
		badge(row.nameEl, c.name, labels);
		row
			.addText((t) => {
				t.setValue(c.name);
				t.inputEl.addEventListener('change', () => { // on Enter / leaving the field
					const to = t.getValue().trim();
					if (!to || to === c.name) return t.setValue(c.name);
					if (labels.categories.some((x) => x.name === to)) { new Notice(`"${to}" already exists.`); return t.setValue(c.name); }
					renameCategory(labels, c.name, to);
					ctx.saveAndRedraw();
				});
			})
			.addDropdown((d) => {
				for (const name of COLOR_NAMES) d.addOption(name, name[0].toUpperCase() + name.slice(1));
				d.setValue(c.color).onChange((v) => { c.color = v; ctx.saveAndRedraw(); });
			})
			.addDropdown((d) => d.addOptions(KIND_LABELS).setValue(c.kind)
				.onChange((v) => { c.kind = v as CategoryKind; ctx.saveAndRedraw(); }));
		confirmDelete(row, 'Delete category, its merchants and one-off edits', () => {
			deleteCategory(labels, c.name);
			ctx.saveAndRedraw();
		});
	}

	// Add.
	let name = '';
	let kind: CategoryKind = 'spending';
	new Setting(el)
		.addText((t) => t.setPlaceholder('New category').onChange((v) => (name = v.trim())))
		.addDropdown((d) => d.addOptions(KIND_LABELS).setValue(kind).onChange((v) => (kind = v as CategoryKind)))
		.addButton((b) => b.setButtonText('Add').onClick(() => {
			if (!name) return;
			if (labels.categories.some((c) => c.name === name)) return void new Notice(`"${name}" already exists.`);
			addCategory(labels, name, kind);
			ctx.saveAndRedraw();
		}));
}
