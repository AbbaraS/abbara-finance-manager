import { App, Modal, Notice, Setting } from 'obsidian';
import type FinancePlugin from '../main';
import { applyCategory } from '../models/applyCategory';
import type { CategoryChoice } from '../models/CategoryChoice';
import { UNCATEGORISED } from '../models/rowKind';
import { rulePattern } from '../models/rulePattern';
import type { Transaction } from '../models/Transaction';
import { countLabel } from '../utils/countLabel';
import { categoryField } from './categoryField';
import { detailsFields } from './detailsFields';
import { directionOf } from './directionOf';
import { pickedSummary } from './pickedSummary';
import { similarFields } from './similarFields';

// Window for editing one or more transactions: category (once or with a rule), subcategory and note.
export class CategoryModal extends Modal {
	private choice: CategoryChoice;

	constructor(app: App, private plugin: FinancePlugin, private rows: Transaction[], private picked: Transaction[], similar: boolean) {
		super(app);
		const first = picked[0];
		const one = picked.length === 1;
		this.choice = {
			category: first.category === UNCATEGORISED ? '' : first.category,
			newKind: null,
			subcategory: one ? first.subcategory : '',
			note: one ? first.note : '',
			other: one ? first.otherAccount : '',
			similar,
			rule: { pattern: rulePattern(first.description), category: '', account: '', direction: directionOf(picked) },
		};
	}

	onOpen() {
		this.titleEl.setText(this.picked.length === 1 ? 'Edit transaction' : `Edit ${countLabel(this.picked.length)}`);
		this.draw();
	}

	onClose() {
		this.contentEl.empty();
	}

	// Rebuilds the form from `choice`; called when a toggle or dropdown changes the layout.
	private draw() {
		const el = this.contentEl;
		el.empty();
		el.addClass('afm-modal');
		const redraw = () => this.draw();

		pickedSummary(el, this.picked, this.plugin.settings);
		categoryField(el, this.choice, this.plugin.settings, redraw);
		detailsFields(el, this.choice, this.plugin.settings, this.rows, this.picked);
		similarFields(el, this.choice, this.picked, this.rows, redraw);

		new Setting(el)
			.addButton((b) => b.setButtonText('Cancel').onClick(() => this.close()))
			.addButton((b) => b.setButtonText('Save').setCta().onClick(() => this.save()));
	}

	// Checks the form, writes to settings and closes.
	private save() {
		const c = this.choice;
		if (!c.category.trim()) return void new Notice('Pick or name a category first.');
		if (c.similar && !c.rule.pattern.trim()) return void new Notice('Type some text from the description for the rule.');

		applyCategory(this.plugin.settings, this.picked, c);
		void this.plugin.saveSettings();
		new Notice(c.similar ? `Rule saved: "${c.rule.pattern.trim()}" → ${c.category.trim()}` : 'Saved');
		this.close();
	}
}
