import { Setting } from 'obsidian';
import { KIND_LABELS, type CategoryKind } from '../models/Category';
import type { CategoryChoice } from '../models/CategoryChoice';
import type { Labels } from '../models/Labels';

// Dropdown value that switches to "new category" mode.
const NEW = '__new__';

// Category dropdown grouped by kind, plus name + kind fields to make a new one.
export function categoryField(el: HTMLElement, c: CategoryChoice, labels: Labels, redraw: () => void): void {
	new Setting(el).setName('Category').addDropdown((d) => {
		d.addOption('', 'Pick a category…');
		for (const kind of Object.keys(KIND_LABELS) as CategoryKind[]) {
			const names = labels.categories.filter((x) => x.kind === kind).map((x) => x.name);
			if (names.length === 0) continue;
			const group = d.selectEl.createEl('optgroup', { attr: { label: KIND_LABELS[kind] } });
			for (const name of names) group.createEl('option', { value: name, text: name });
		}
		d.addOption(NEW, '+ New category…');
		d.setValue(c.newKind ? NEW : c.category);
		d.onChange((v) => {
			c.newKind = v === NEW ? 'spending' : null;
			c.category = v === NEW ? '' : v;
			c.subcategory = ''; // subcategories and people belong to one category
			c.newSub = false;
			c.person = '';
			c.newPerson = false;
			redraw();
		});
	});
	if (!c.newKind) return;

	// New category.
	new Setting(el).setName('Name').addText((t) => {
		t.setPlaceholder('e.g. Health').setValue(c.category).onChange((v) => (c.category = v));
		window.setTimeout(() => t.inputEl.focus(), 0);
	});
	new Setting(el)
		.setName('Counts as')
		.setDesc('Spending: money out is spent, money in is a refund. People: money out is spent, money in is from people (not income). Income: money in is income. Transfers and Savings: not counted.')
		.addDropdown((d) => d.addOptions(KIND_LABELS).setValue(c.newKind ?? 'spending')
			.onChange((v) => { c.newKind = v as CategoryKind; redraw(); }));
}
