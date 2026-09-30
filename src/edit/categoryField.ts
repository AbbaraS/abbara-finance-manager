import { Setting } from 'obsidian';
import { CATEGORIES } from '../defaults/categories';
import { KIND_GROUP } from '../models/Category';
import type { CategoryChoice } from '../models/CategoryChoice';

// Category dropdown with the fixed categories, grouped as Spending / Income / Not counted.
export function categoryField(el: HTMLElement, c: CategoryChoice, redraw: () => void): void {
	new Setting(el).setName('Category').addDropdown((d) => {
		d.addOption('', 'Pick a category…');
		const groups = new Map<string, HTMLElement>();
		for (const cat of CATEGORIES) {
			const label = KIND_GROUP[cat.kind];
			const group = groups.get(label) ?? d.selectEl.createEl('optgroup', { attr: { label } });
			groups.set(label, group);
			group.createEl('option', { value: cat.name, text: cat.name });
		}
		d.setValue(c.category).onChange((v) => { c.category = v; redraw(); }); // redraw: suggestions / transfer field change
	});
}
