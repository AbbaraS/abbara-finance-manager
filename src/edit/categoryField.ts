import { Setting } from 'obsidian';
import { KIND_LABELS, type CategoryKind } from '../models/Category';
import type { CategoryChoice } from '../models/CategoryChoice';
import { REFUND } from '../models/categorise';
import type { Labels } from '../models/Labels';
import { subcategoryNames } from '../models/subcategoryNames';
import type { Transaction } from '../models/Transaction';

// Dropdown values that switch to "new category" / "new subcategory" mode, and the one between category and subcategory.
const NEW = '__new__';
const NEW_SUB = '__newsub__';
const SEP = '\u001f';

// One dropdown for category and subcategory together ("Essential › Groceries"), grouped by kind, plus
// "+ New subcategory in Essential…" and "+ New category…". People categories pick the person and their
// subcategory below (detailsFields).
export function categoryField(el: HTMLElement, c: CategoryChoice, labels: Labels, rows: Transaction[], redraw: () => void): void {
	const kindOf = (name: string) => labels.categories.find((x) => x.name === name)?.kind;
	const sub = c.subcategory === REFUND ? '' : c.subcategory;
	new Setting(el).setName('Category').setDesc('Type to jump, e.g. "gro" for Groceries.').addDropdown((d) => {
		d.addOption('', 'Pick a category…');
		for (const kind of Object.keys(KIND_LABELS) as CategoryKind[]) {
			const cats = labels.categories.filter((x) => x.kind === kind);
			if (cats.length === 0) continue;
			const group = d.selectEl.createEl('optgroup', { attr: { label: KIND_LABELS[kind] } });
			for (const cat of cats) {
				group.createEl('option', { value: cat.name, text: cat.name });
				if (kind === 'people') continue; // the person's own subcategories are picked below
				const subs = new Set(subcategoryNames(cat.name, '', labels, rows));
				if (cat.name === c.category && sub && !c.newSub) subs.add(sub);
				for (const s of [...subs].sort((a, b) => a.localeCompare(b))) group.createEl('option', { value: `${cat.name}${SEP}${s}`, text: `${cat.name} › ${s}` });
			}
		}
		if (c.category && !c.newKind && kindOf(c.category) !== 'people') d.addOption(NEW_SUB, `+ New subcategory in ${c.category}…`);
		d.addOption(NEW, '+ New category…');
		d.setValue(c.newKind ? NEW : c.newSub && kindOf(c.category) !== 'people' ? NEW_SUB : sub && kindOf(c.category) !== 'people' ? `${c.category}${SEP}${sub}` : c.category);
		d.onChange((v) => {
			if (v === NEW_SUB) {
				Object.assign(c, { newSub: true, subcategory: '' });
				return redraw();
			}
			const [category, subcategory = ''] = v === NEW ? [''] : v.split(SEP);
			const samePerson = category === c.category && kindOf(category) === 'people';
			Object.assign(c, { newKind: v === NEW ? 'spending' : null, category, subcategory, newSub: false });
			if (!samePerson) Object.assign(c, { person: '', newPerson: false }); // people belong to one category
			redraw();
		});
	});

	// New subcategory (not under People) or new category.
	if (c.newSub && !c.newKind && kindOf(c.category) !== 'people') {
		new Setting(el).setName(`New subcategory in ${c.category}`).addText((t) => {
			t.setPlaceholder('e.g. Groceries').setValue(c.subcategory).onChange((v) => (c.subcategory = v));
			window.setTimeout(() => t.inputEl.focus(), 0);
		});
	}
	if (!c.newKind) return;
	new Setting(el).setName('Name').addText((t) => {
		t.setPlaceholder('e.g. Health').setValue(c.category).onChange((v) => (c.category = v));
		window.setTimeout(() => t.inputEl.focus(), 0);
	});
	new Setting(el)
		.setName('Counts as')
		.setDesc('Spending: money out is spent, money in is a refund. People: money out is spent, money in is from people (not income). Income: money in is income. Transfers and Savings: not counted.')
		.addDropdown((d) => d.addOptions(KIND_LABELS).setValue(c.newKind ?? 'spending')
			.onChange((v) => { c.newKind = v as CategoryKind; redraw(); }));
	new Setting(el).setName('Subcategory').setDesc('Optional.').addText((t) => t.setPlaceholder('e.g. Pharmacy').setValue(c.subcategory).onChange((v) => (c.subcategory = v)));
}
