import { Setting } from 'obsidian';
import { accountNames } from '../models/accountNames';
import { findCategory } from '../models/categories';
import type { CategoryChoice } from '../models/CategoryChoice';
import type { Labels } from '../models/Labels';
import { subcategoryNames } from '../models/subcategoryNames';
import type { Transaction } from '../models/Transaction';

// Dropdown value that switches to "new subcategory" mode.
const NEW = '__new__';

// Subcategory (pick one or make one; the person under People), note, tags, and the other account for transfers.
export function detailsFields(el: HTMLElement, c: CategoryChoice, labels: Labels, rows: Transaction[], picked: Transaction[], redraw: () => void): void {
	const kind = c.newKind ?? findCategory(labels, c.category)?.kind ?? null;
	const person = kind === 'people';

	// Subcategory: ones used before in this category, or a new one.
	const names = [...new Set([...subcategoryNames(c.category, labels, rows), c.subcategory].filter(Boolean))];
	new Setting(el)
		.setName(person ? 'Person' : 'Subcategory')
		.setDesc(person ? 'Who the money went to or came from.' : kind === 'spending' ? 'Optional. Money in with none shows as "Refund".' : 'Optional.')
		.addDropdown((d) => {
			d.addOption('', 'None');
			for (const name of names) d.addOption(name, name);
			d.addOption(NEW, person ? '+ New person…' : '+ New subcategory…');
			d.setValue(c.newSub ? NEW : c.subcategory);
			d.onChange((v) => { c.newSub = v === NEW; c.subcategory = c.newSub ? '' : v; redraw(); });
		});
	if (c.newSub) {
		new Setting(el).setName(person ? 'Name' : 'New subcategory').addText((t) => {
			t.setPlaceholder(person ? 'e.g. Sara' : 'e.g. Groceries').setValue(c.subcategory).onChange((v) => (c.subcategory = v));
			window.setTimeout(() => t.inputEl.focus(), 0);
		});
	}

	// Note: one transaction only.
	if (picked.length === 1) {
		new Setting(el)
			.setName('Note')
			.addTextArea((t) => t.setPlaceholder('Anything to remember about this one').setValue(c.note)
				.onChange((v) => (c.note = v)));
	}

	// Tags, e.g. "syria-trip, gift".
	new Setting(el)
		.setName('Tags')
		.setDesc(picked.length === 1 ? 'Separate with commas.' : 'Added to every picked transaction. Separate with commas.')
		.addText((t) => t.setPlaceholder('None').setValue(c.tags.join(', '))
			.onChange((v) => (c.tags = v.split(',').map((x) => x.trim().replace(/^#/, '')).filter(Boolean))));

	// Other account: only for transfers.
	if (kind !== 'transfer') return;
	const own = picked[0].account;
	new Setting(el)
		.setName(picked[0].amount < 0 ? 'Sent to' : 'Came from')
		.setDesc('Usually found by matching the amount in your other accounts. Add accounts without statements in settings.')
		.addDropdown((d) => {
			d.addOption('', 'Find automatically');
			for (const a of accountNames(rows, labels.accounts)) if (a !== own) d.addOption(a, a);
			d.setValue(c.other).onChange((v) => (c.other = v));
		});
}
