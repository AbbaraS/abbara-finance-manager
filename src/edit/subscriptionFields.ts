import { Setting } from 'obsidian';
import { KEEP_SUBSCRIPTION, NEW_SUBSCRIPTION, type CategoryChoice } from '../models/CategoryChoice';
import type { Labels } from '../models/Labels';
import { rulePattern } from '../models/rulePattern';
import { NO_SUBSCRIPTION, PERIOD_LABELS, type Period, type Subscription } from '../models/Subscription';
import { guessPeriod } from '../models/subscriptions';
import type { Transaction } from '../models/Transaction';
import { parseMoney } from '../utils/money';

// A new subscription filled in from the picked payments: their merchant, amount and how often they repeat.
export function draftSubscription(labels: Labels, rows: Transaction[], picked: Transaction[]): Subscription {
	const first = picked[0];
	const match = rulePattern(first.description);
	const oneAmount = picked.every((t) => t.amount === first.amount) && first.amount < 0;
	const repeats = rows.filter((t) => t.amount === first.amount && rulePattern(t.description) === match);
	return {
		name: '', type: labels.types[0]?.name ?? '', match, amount: oneAmount ? -first.amount : null,
		period: guessPeriod(repeats), payments: null, paidBefore: 0, status: '',
	};
}

// Subscription: found automatically, none, one you have, or a new one (name, type, text, amount, how often, out of).
export function subscriptionFields(el: HTMLElement, c: CategoryChoice, labels: Labels, picked: Transaction[], redraw: () => void): void {
	const found = picked.length === 1 ? picked[0].subscription : '';
	new Setting(el)
		.setName('Subscription')
		.setDesc('Found by description and amount. Pick one here if a payment got the wrong one.')
		.addDropdown((d) => {
			if (picked.length > 1) d.addOption(KEEP_SUBSCRIPTION, 'Keep as they are');
			d.addOption('', `Automatic (${found || 'none'})`);
			d.addOption(NO_SUBSCRIPTION, 'Not a subscription');
			for (const s of labels.subscriptions) d.addOption(s.name, s.name);
			d.addOption(NEW_SUBSCRIPTION, '+ New subscription…');
			d.setValue(c.subscription).onChange((v) => { c.subscription = v; redraw(); });
		});
	if (c.subscription !== NEW_SUBSCRIPTION) return;

	// New subscription.
	const n = c.newSubscription;
	new Setting(el).setName('Name').addText((t) => {
		t.setPlaceholder('e.g. iCloud+').setValue(n.name).onChange((v) => (n.name = v));
		window.setTimeout(() => t.inputEl.focus(), 0);
	});
	new Setting(el).setName('Type').addDropdown((d) => {
		d.addOption('', 'None');
		for (const t of labels.types) d.addOption(t.name, t.name);
		d.setValue(n.type).onChange((v) => (n.type = v));
	});
	new Setting(el)
		.setName('Description contains')
		.setDesc('Payments with this text and amount get this subscription.')
		.addText((t) => t.setValue(n.match).onChange((v) => (n.match = v)));
	new Setting(el)
		.setName('Amount')
		.setDesc('Cost of one payment. Empty = any amount.')
		.addText((t) => t.setValue(n.amount === null ? '' : n.amount.toFixed(2)).onChange((v) => (n.amount = parseMoney(v))));
	new Setting(el)
		.setName('How often')
		.setDesc('Tells apart two subscriptions with the same price.')
		.addDropdown((d) => d.addOptions(PERIOD_LABELS).setValue(n.period).onChange((v) => (n.period = v as Period)));
	new Setting(el)
		.setName('Number of payments')
		.setDesc('For instalments, e.g. 10 shows "5/10". Empty if it keeps going.')
		.addText((t) => t.setPlaceholder('e.g. 10').setValue(n.payments ? String(n.payments) : '')
			.onChange((v) => (n.payments = parseInt(v) > 0 ? parseInt(v) : null)));
}
