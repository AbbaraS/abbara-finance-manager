import { Setting, type App } from 'obsidian';
import { accountNames } from '../models/accountNames';
import { findCategory } from '../models/categories';
import type { CategoryChoice } from '../models/CategoryChoice';
import { debtGroups, debtShare, defaultReason, owed } from '../models/debts';
import type { FinanceSettings } from '../models/FinanceSettings';
import { tagNames, type Labels } from '../models/Labels';
import { peopleIn } from '../models/people';
import { subcategoryNames } from '../models/subcategoryNames';
import type { Transaction } from '../models/Transaction';
import { formatMoney, parseMoney } from '../utils/money';
import { tagInput } from './tagInput';

// Dropdown value that switches to "new" mode.
const NEW = '__new__';

// Person (under People) and whether it counts as a debt, subcategory (pick one or make one), note, tags, and the other account for transfers.
export function detailsFields(app: App, el: HTMLElement, c: CategoryChoice, labels: Labels, rows: Transaction[], picked: Transaction[], s: FinanceSettings, redraw: () => void): void {
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
		debtField(el, c, labels, picked, s, redraw);
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

// "Counts as a debt": money in from the person adds to what you owe them, money out pays it back.
// For one transaction, how much of it counts: e.g. £205 of £270 pays back the debt and the rest stays as Allowance.
function debtField(el: HTMLElement, c: CategoryChoice, labels: Labels, picked: Transaction[], s: FinanceSettings, redraw: () => void): void {
	const person = c.newPerson ? '' : c.person.trim();
	const who = c.newPerson ? 'them' : person || 'the person';
	const ins = picked.filter((t) => t.amount > 0).length;
	const desc = ins === picked.length ? `Borrowed: adds to what you owe ${who}.`
		: ins === 0 ? `Paying back: takes it off what you owe ${who}.`
			: `Money in adds to what you owe ${who}, money out pays it back.`;
	new Setting(el)
		.setName('Counts as a debt')
		.setDesc(c.debt === null ? `${desc} Some picked rows are, some aren't; leave it to keep them as they are.` : desc)
		.addToggle((t) => t.setValue(c.debt ?? false).onChange((v) => { c.debt = v; redraw(); }));
	if (!c.debt || picked.length !== 1 || !person) return;

	// Which debt it goes towards (Car, Shein...), then how much of it: what's left of that debt by default (money out), all of it for money in.
	const t = picked[0];
	const own = labels.debts.find((d) => d.transaction === t.id && d.person === person);
	const groups = debtGroups(labels, person);
	const reason = c.debtReason ?? defaultReason(labels, t, person);
	const leftOf = (r: string) => owed(labels, person, r) - (own && own.reason === r ? own.amount : 0); // without this transaction
	const label = (r: string) => `${r || 'No reason'} · ${leftOf(r) > 0 ? `${formatMoney(leftOf(r), s)} left` : leftOf(r) < 0 ? `${formatMoney(-leftOf(r), s)} to you` : 'paid off'}`;
	new Setting(el)
		.setName('For')
		.setDesc(t.amount < 0 ? 'Which debt this pays back.' : 'What you borrowed it for, e.g. Car or Tuition fees.')
		.addDropdown((d) => {
			const names = [...new Set(['', ...groups.map((g) => g.reason), c.newDebtReason ? '' : reason])];
			for (const r of names) d.addOption(r, label(r));
			d.addOption(NEW, '+ New reason…');
			d.setValue(c.newDebtReason ? NEW : reason);
			d.onChange((v) => {
				c.newDebtReason = v === NEW;
				c.debtReason = c.newDebtReason ? '' : v;
				c.debtAmount = null; // suggest again for this debt
				redraw();
			});
		});
	if (c.newDebtReason) {
		new Setting(el).setName('New reason').addText((x) => {
			x.setPlaceholder('e.g. Car').setValue(c.debtReason ?? '').onChange((v) => (c.debtReason = v));
			window.setTimeout(() => x.inputEl.focus(), 0);
		});
	}

	const before = leftOf(reason);
	const shown = c.debtAmount ?? Math.abs(debtShare(labels, t, person, reason));
	const what = reason ? ` for ${reason}` : '';
	const owing = before > 0 ? `You owe ${person} ${formatMoney(before, s)}${what} without this one.`
		: before < 0 ? `${person} owes you ${formatMoney(-before, s)}${what} without this one.` : `You owe ${person} nothing${what} without this one.`;
	new Setting(el)
		.setName(t.amount < 0 ? 'Amount paid back' : 'Amount borrowed')
		.setDesc(`Of ${formatMoney(Math.abs(t.amount), s)}. ${owing} The rest stays in the subcategory above.`)
		.addText((x) => x.setValue(String(shown)).onChange((v) => (c.debtAmount = parseMoney(v))));
}
