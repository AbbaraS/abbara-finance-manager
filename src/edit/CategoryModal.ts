import { App, Modal, Notice, Setting } from 'obsidian';
import type FinancePlugin from '../main';
import { applyCategory } from '../models/applyCategory';
import { categorise } from '../models/categorise';
import { setLabel } from '../models/Labels';
import { KEEP_COUNTERPARTY, KEEP_SUBSCRIPTION, NEW_SUBSCRIPTION, type CategoryChoice } from '../models/CategoryChoice';
import { findCounterparty } from '../models/counterparties';
import { cleanPatterns } from '../models/counterpartyMatches';
import { guessName, guessPattern, guessPersonPattern } from '../models/guessCounterparty';
import { findCategory } from '../models/categories';
import { UNCATEGORISED } from '../models/rowKind';
import type { Transaction } from '../models/Transaction';
import { countLabel } from '../utils/countLabel';
import { categoryField } from './categoryField';
import { detailsFields } from './detailsFields';
import { directionOf } from './directionOf';
import { pickedSummary } from './pickedSummary';
import { similarFields, useItsCategory } from './similarFields';
import { draftSubscription, subscriptionFields } from './subscriptionFields';

// Window for editing one or more transactions: category (once or remembered for the counterparty), person, subcategory,
// counterparty, subscription, note and tags. `newSubscription` opens it ready to name a new subscription.
export class CategoryModal extends Modal {
	private choice: CategoryChoice;

	constructor(app: App, private plugin: FinancePlugin, private rows: Transaction[], private picked: Transaction[], similar: boolean, newSubscription = false) {
		super(app);
		const first = picked[0];
		const one = picked.length === 1;
		const labels = plugin.db.labels;
		const patterns = cleanPatterns(picked.map((t) => guessPattern(t.description)));
		const shared = picked.every((t) => t.counterparty === first.counterparty) ? first.counterparty : '';
		this.choice = {
			category: first.category === UNCATEGORISED ? '' : first.category,
			newKind: null,
			subcategory: one ? first.subcategory : '',
			newSub: false,
			person: one ? first.person : '',
			newPerson: false,
			subscription: newSubscription ? NEW_SUBSCRIPTION : one ? labels.transactions[first.id]?.subscription ?? '' : KEEP_SUBSCRIPTION,
			newSubscription: draftSubscription(labels, rows, picked),
			note: one ? first.note : '',
			tags: one ? first.tags : [],
			other: one ? first.otherAccount : '',
			debt: picked.every((t) => t.debt) ? true : picked.some((t) => t.debt) ? null : false,
			debtAmount: null,
			debtReason: null,
			newDebtReason: false,
			similar,
			personPatterns: cleanPatterns(picked.map((t) => guessPersonPattern(t.description))),
			draft: { name: guessName(patterns[0] ?? ''), patterns, category: '', account: '', direction: directionOf(picked) },
			addTo: shared ? findCounterparty(labels, shared) ?? null : null, // rows that already share one add to it
			counterparty: one ? labels.transactions[first.id]?.counterparty ?? '' : KEEP_COUNTERPARTY,
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

		pickedSummary(el, this.picked, this.plugin.settings, this.plugin.db.labels, this.rows, (r, p, unlink) => this.relink(r, p, unlink));
		categoryField(el, this.choice, this.plugin.db.labels, redraw);
		detailsFields(this.app, el, this.choice, this.plugin.db.labels, this.rows, this.picked, this.plugin.settings, redraw);
		similarFields(el, this.choice, this.plugin.db.labels, this.picked, this.rows, redraw);
		subscriptionFields(el, this.choice, this.plugin.db.labels, this.picked, redraw);

		new Setting(el)
			.addButton((b) => b.setButtonText('Cancel').onClick(() => this.close()))
			.addButton((b) => b.setButtonText('Save').setCta().onClick(() => this.save()));
	}

	// Unlinks a refund from a purchase (or links them again), saves straight away and redraws with the new links.
	private relink(refund: string, purchase: string, unlink: boolean) {
		const labels = this.plugin.db.labels;
		const now = labels.transactions[refund]?.notRefundOf ?? [];
		setLabel(labels, refund, { notRefundOf: unlink ? [...new Set([...now, purchase])] : now.filter((id) => id !== purchase) });
		void this.plugin.save();
		this.rows = categorise(this.plugin.db.rows, labels);
		const byId = new Map(this.rows.map((t) => [t.id, t]));
		this.picked = this.picked.map((t) => byId.get(t.id) ?? t);
		new Notice(unlink ? 'Unlinked: no longer counted as its refund.' : 'Linked again where it still fits.');
		this.draw();
	}

	// Checks the form, writes to your labels and closes.
	private save() {
		const c = this.choice;
		const labels = this.plugin.db.labels;
		useItsCategory(c, c.similar ? c.addTo : findCounterparty(labels, c.counterparty) ?? null); // no category picked: the counterparty's
		if (!c.category.trim()) return void new Notice(c.newKind ? 'Name the new category first.' : 'Pick a category first.');
		const forPerson = c.similar && findCategory(labels, c.category.trim())?.kind === 'people';
		if (forPerson && !c.person.trim()) return void new Notice('Pick or add the person first.');
		if (forPerson && cleanPatterns(c.personPatterns).length === 0) return void new Notice('Type some text from the description.');
		const name = c.draft.name.trim();
		if (c.similar && !forPerson && !c.addTo && !name) return void new Notice('Name the counterparty first.');
		if (c.similar && !forPerson && !c.addTo && labels.counterparties.some((x) => x.name.toLowerCase() === name.toLowerCase())) {
			return void new Notice(`"${name}" already exists. Pick it under Save as.`);
		}
		if (c.similar && !forPerson && !c.addTo && cleanPatterns(c.draft.patterns).length === 0) return void new Notice('Type some text from the description.');
		const most = Math.abs(this.picked[0].amount);
		if (c.debt && c.debtAmount !== null && (c.debtAmount <= 0 || c.debtAmount > most + 0.005)) {
			return void new Notice('The debt part has to be more than 0 and no more than the transaction.');
		}
		const sub = c.newSubscription.name.trim();
		if (c.subscription === NEW_SUBSCRIPTION && !sub) return void new Notice('Name the new subscription first.');
		if (c.subscription === NEW_SUBSCRIPTION && labels.subscriptions.some((s) => s.name === sub)) return void new Notice(`"${sub}" already exists.`);

		applyCategory(labels, this.picked, c);
		void this.plugin.save();
		new Notice(forPerson ? `Remembered ${c.person.trim()}` : c.similar ? `Remembered ${c.addTo?.name ?? name} → ${c.category.trim()}` : 'Saved');
		this.close();
	}
}
