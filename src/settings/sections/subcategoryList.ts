import { Notice, Setting } from 'obsidian';
import { addSubcategory, deleteSubcategory, renameSubcategory, subcategoriesOf } from '../../models/categories';
import { collapsible } from '../collapsible';
import { confirmDelete } from '../confirmDelete';
import type { SettingsContext } from '../context';

// A category's subcategories (a person's own under People), collapsed: rename, delete, add.
export function subcategoryList(el: HTMLElement, ctx: SettingsContext, parent: string, person = ''): void {
	const labels = ctx.plugin.db.labels;
	const subs = subcategoriesOf(labels, parent, person);
	const names = subs.map((s) => s.name).join(', ');
	const box = collapsible(el, ctx, `subs:${parent}:${person}`, subs.length ? `Subcategories: ${names}` : 'No subcategories');
	box.addClass('afm-subs');

	for (const s of subs) {
		const row = new Setting(box).addText((t) => {
			t.setValue(s.name);
			t.inputEl.addEventListener('change', () => { // on Enter / leaving the field
				const to = t.getValue().trim();
				if (!to || to === s.name) return t.setValue(s.name);
				if (subs.some((x) => x.name === to)) { new Notice(`"${to}" already exists.`); return t.setValue(s.name); }
				renameSubcategory(labels, s, to);
				ctx.saveAndRedraw();
			});
		});
		confirmDelete(row, 'Delete subcategory (its transactions keep the category)', () => {
			deleteSubcategory(labels, s);
			ctx.saveAndRedraw();
		});
	}

	// Add.
	let name = '';
	new Setting(box)
		.addText((t) => t.setPlaceholder('New subcategory').onChange((v) => (name = v.trim())))
		.addButton((b) => b.setButtonText('Add').onClick(() => {
			if (!name) return;
			if (subs.some((x) => x.name === name)) return void new Notice(`"${name}" already exists.`);
			addSubcategory(labels, parent, name, person);
			ctx.saveAndRedraw();
		}));
}
