import { Setting, type App } from 'obsidian';
import { accountNames } from '../models/accountNames';
import { findCategory } from '../models/categories';
import type { CategoryChoice } from '../models/CategoryChoice';
import { tagNames, type Labels } from '../models/Labels';
import { peopleIn } from '../models/people';
import { subcategoryNames } from '../models/subcategoryNames';
import type { Transaction } from '../models/Transaction';
import { tagInput } from './tagInput';

// Dropdown value that switches to "new" mode.
const NEW = '__new__';

// Person (under People), subcategory (pick one or make one), note, tags, and the other account for transfers.
export function detailsFields(app: App, el: HTMLElement, c: CategoryChoice, labels: Labels, rows: Transaction[], picked: Transaction[], redraw: () => void): void {
	const kind = c.newKind ?? findCategory(labels, c.category)?.kind ?? null;
	const people = kind === 'people';

	// Person: People categories only. Each person has their own subcategories.
	if (people) {
		const names = [...new Set([...peopleIn(labels, c.category), c.person].filter(Boolean))];
		new Setting(el)
			.setName('Person')
			.setDesc('Who the money went to or came from.')
			.addDropdown((d) => {
				d.addOption('', 'None');
				for (const name of names) d.addOption(name, name);
				d.addOption(NEW, '+ New person…');
				d.setValue(c.newPerson ? NEW : c.person);
				d.onChange((v) => {
					c.newPerson = v === NEW;
					c.person = c.newPerson ? '' : v;
					c.subcategory = ''; // subcategories belong to one person
					c.newSub = false;
					redraw();
				});
			});
		if (c.newPerson) {
			new Setting(el).setName('Name').addText((t) => {
				t.setPlaceholder('e.g. Sara').setValue(c.person).onChange((v) => (c.person = v));
				window.setTimeout(() => t.inputEl.focus(), 0);
			});
		}
	}

	// Subcategory: the category's own (the person's own under People), or a new one.
	const person = people ? c.person.trim() : '';
	const names = [...new Set([...subcategoryNames(c.category, person, labels, rows), c.subcategory].filter(Boolean))];
	const desc = people ? `${person ? `${person}'s own` : 'Each person\'s own'}, e.g. Allowance. Optional.`
		: kind === 'spending' ? 'Optional. Money in with none shows as "Refund".' : 'Optional.';
	new Setting(el)
		.setName('Subcategory')
		.setDesc(desc)
		.addDropdown((d) => {
			d.addOption('', 'None');
			for (const name of names) d.addOption(name, name);
			d.addOption(NEW, '+ New subcategory…');
			d.setValue(c.newSub ? NEW : c.subcategory);
			d.onChange((v) => { c.newSub = v === NEW; c.subcategory = c.newSub ? '' : v; redraw(); });
		});
	if (c.newSub) {
		new Setting(el).setName('New subcategory').addText((t) => {
			t.setPlaceholder(people ? 'e.g. Allowance' : 'e.g. Groceries').setValue(c.subcategory).onChange((v) => (c.subcategory = v));
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

	// Tags: pick ones you've used or type a new one.
	const tags = new Setting(el)
		.setName('Tags')
		.setDesc(picked.length === 1 ? 'Pick one you\'ve used or type a new one.' : 'Added to every picked transaction.');
	tags.settingEl.addClass('afm-wrap');
	tagInput(app, tags.controlEl, c.tags, tagNames(labels), (v) => (c.tags = v));

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
