import { Setting } from 'obsidian';
import { accountNames } from '../models/accountNames';
import type { CategoryChoice } from '../models/CategoryChoice';
import type { FinanceSettings } from '../models/FinanceSettings';
import type { Transaction } from '../models/Transaction';
import { subcategoryNames } from '../models/subcategoryNames';

// Subcategory (with suggestions), note, and the other account for transfers.
export function detailsFields(el: HTMLElement, c: CategoryChoice, s: FinanceSettings, rows: Transaction[], picked: Transaction[]): void {
	// Subcategory, suggesting ones already used in this category.
	new Setting(el)
		.setName('Subcategory')
		.setDesc('Optional, e.g. "Car sold" under Income or "Gold" under Investment.')
		.addText((t) => {
			t.setPlaceholder('None').setValue(c.subcategory).onChange((v) => (c.subcategory = v));
			const list = el.createEl('datalist', { attr: { id: 'afm-sub-suggestions' } });
			for (const name of subcategoryNames(c.category, s, rows)) list.createEl('option', { value: name });
			t.inputEl.setAttr('list', list.id);
		});

	// Note: one transaction only.
	if (picked.length === 1) {
		new Setting(el)
			.setName('Note')
			.addTextArea((t) => t.setPlaceholder('Anything to remember about this one').setValue(c.note)
				.onChange((v) => (c.note = v)));
	}

	// Other account: only for transfers.
	if (s.categories.find((x) => x.name === c.category)?.kind !== 'transfer') return;
	const own = picked[0].account;
	new Setting(el)
		.setName(picked[0].amount < 0 ? 'Sent to' : 'Came from')
		.setDesc('Usually found by matching the amount in your other accounts.')
		.addDropdown((d) => {
			d.addOption('', 'Find automatically');
			for (const a of accountNames(rows)) if (a !== own) d.addOption(a, a);
			d.setValue(c.other).onChange((v) => (c.other = v));
		});
}
