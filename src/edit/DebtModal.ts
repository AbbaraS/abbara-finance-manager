import { App, Modal, Notice, Setting } from 'obsidian';
import type FinancePlugin from '../main';
import type { Debt } from '../models/debts';
import { parseMoney } from '../utils/money';

// Window to add, change or delete a debt entry by hand: who, what it's for, borrowed or paid back, amount, date and a note.
// Entries for marked transactions are changed in the transaction's edit window instead.
export class DebtModal extends Modal {
	private draft: Debt;
	private borrowed: boolean;

	constructor(app: App, private plugin: FinancePlugin, private debt: Debt | null, person = '') {
		super(app);
		const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD, local time
		this.draft = debt ? { ...debt, amount: Math.abs(debt.amount) } : { person, date: today, amount: 0, note: '', reason: '', transaction: '' };
		this.borrowed = debt ? debt.amount >= 0 : true;
	}

	onOpen() {
		const el = this.contentEl;
		const d = this.draft;
		const people = this.plugin.db.labels.people.map((p) => p.name).sort((a, b) => a.localeCompare(b));
		this.titleEl.setText(this.debt ? 'Edit debt' : 'Add debt');
		el.addClass('afm-modal');

		new Setting(el).setName('Person').addDropdown((dd) => {
			dd.addOption('', 'Pick a person…');
			for (const p of people) dd.addOption(p, p);
			dd.setValue(d.person).onChange((v) => (d.person = v));
		});
		// What it's for: type a new reason or pick one already used.
		const reasons = [...new Set(this.plugin.db.labels.debts.map((x) => x.reason).filter(Boolean))].sort((a, b) => a.localeCompare(b));
		const list = el.createEl('datalist', { attr: { id: 'afm-debt-reasons' } });
		for (const r of reasons) list.createEl('option', { value: r });
		new Setting(el).setName('For').setDesc('Keeps separate debts apart, e.g. Car, Shein, Tuition fees. Optional.').addText((t) => {
			t.setPlaceholder('e.g. Car').setValue(d.reason).onChange((v) => (d.reason = v));
			t.inputEl.setAttr('list', 'afm-debt-reasons');
		});
		new Setting(el).setName('What happened').addDropdown((dd) => dd
			.addOption('borrowed', 'I borrowed (I owe more)')
			.addOption('paid', 'I paid back (I owe less)')
			.setValue(this.borrowed ? 'borrowed' : 'paid')
			.onChange((v) => (this.borrowed = v === 'borrowed')));
		new Setting(el).setName('Amount').addText((t) => {
			t.setPlaceholder('e.g. 50').setValue(d.amount ? String(d.amount) : '').onChange((v) => (d.amount = parseMoney(v) ?? 0));
			window.setTimeout(() => t.inputEl.focus(), 0);
		});
		new Setting(el).setName('Date').addText((t) => {
			t.inputEl.type = 'date';
			t.setValue(d.date).onChange((v) => (d.date = v));
		});
		new Setting(el).setName('Note').setClass('afm-wrap')
			.addTextArea((t) => t.setPlaceholder('e.g. Flights to Amman, paid by Mum').setValue(d.note).onChange((v) => (d.note = v)));

		const buttons = new Setting(el);
		if (this.debt) buttons.addButton((b) => b.setButtonText('Delete').setWarning().onClick(() => this.remove()));
		buttons
			.addButton((b) => b.setButtonText('Cancel').onClick(() => this.close()))
			.addButton((b) => b.setButtonText('Save').setCta().onClick(() => this.save()));
	}

	onClose() {
		this.contentEl.empty();
	}

	// Checks the form, then adds or updates the entry.
	private save() {
		const d = this.draft;
		if (!d.person) return void new Notice('Pick a person first.');
		if (!d.amount) return void new Notice('Type an amount first.');
		if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date)) return void new Notice('Pick a date first.');
		const entry = { ...d, note: d.note.trim(), reason: d.reason.trim(), amount: this.borrowed ? d.amount : -d.amount };
		if (this.debt) Object.assign(this.debt, entry);
		else this.plugin.db.labels.debts.push(entry);
		void this.plugin.save();
		this.close();
	}

	// Removes the entry.
	private remove() {
		const labels = this.plugin.db.labels;
		labels.debts = labels.debts.filter((x) => x !== this.debt);
		void this.plugin.save();
		this.close();
	}
}
