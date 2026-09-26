import { Setting } from 'obsidian';
import { KIND_LABELS, type CategoryKind } from '../models/Category';
import type { CategoryChoice } from '../models/CategoryChoice';
import type { FinanceSettings } from '../models/FinanceSettings';

// Dropdown value that switches to "new category" mode.
const NEW = '__new__';

// Category dropdown grouped by kind, plus name + kind fields for a new category.
export function categoryField(el: HTMLElement, c: CategoryChoice, s: FinanceSettings, redraw: () => void): void {
	new Setting(el).setName('Category').addDropdown((d) => {
		d.addOption('', 'Pick a category…');
		for (const kind of Object.keys(KIND_LABELS) as CategoryKind[]) {
			const names = s.categories.filter((x) => x.kind === kind).map((x) => x.name).sort((a, b) => a.localeCompare(b));
			if (names.length === 0) continue;
			const group = d.selectEl.createEl('optgroup', { attr: { label: KIND_LABELS[kind] } });
			for (const name of names) group.createEl('option', { value: name, text: name });
		}
		d.addOption(NEW, '+ New category…');
		d.setValue(c.newKind ? NEW : c.category);
		d.onChange((v) => {
			c.newKind = v === NEW ? 'spending' : null;
			c.category = v === NEW ? '' : v;
			redraw();
		});
	});
	if (!c.newKind) return;

	// New category.
	new Setting(el).setName('Name').addText((t) => {
		t.setPlaceholder('e.g. Family support').setValue(c.category).onChange((v) => (c.category = v));
		window.setTimeout(() => t.inputEl.focus(), 0);
	});
	new Setting(el)
		.setName('Counts as')
		.addDropdown((d) => d.addOptions(KIND_LABELS).setValue(c.newKind ?? 'spending')
			.onChange((v) => (c.newKind = v as CategoryKind)));
}
