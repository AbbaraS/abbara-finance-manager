import { Notice, Setting } from 'obsidian';
import { PERIOD_LABELS, STATUS_LABELS, type Period, type Subscription, type SubscriptionStatus } from '../../models/Subscription';
import { addSubscription, deleteSubscription, deleteType, renameSubscription, renameType } from '../../models/subscriptions';
import { countLabel } from '../../utils/countLabel';
import { parseMoney } from '../../utils/money';
import { collapsible } from '../collapsible';
import { confirmDelete } from '../confirmDelete';
import type { SettingsContext } from '../context';

// Types (Subscription, Instalments...) and your subscriptions with how they're matched, collapsed.
export function subscriptionsSection(el: HTMLElement, ctx: SettingsContext): void {
	const labels = ctx.plugin.db.labels;
	new Setting(el)
		.setName('Subscriptions')
		.setDesc('A payment gets a subscription when its description has the text and, if set, the amount. When two have the same price, the one due nearest the date wins. Name new ones from the edit window.')
		.setHeading();

	// Types.
	const types = collapsible(el, ctx, 'types', `Types: ${labels.types.map((t) => t.name).join(', ') || 'none'}`);
	for (const type of labels.types) {
		const row = new Setting(types).addText((t) => {
			t.setValue(type.name);
			t.inputEl.addEventListener('change', () => {
				const to = t.getValue().trim();
				if (!to || to === type.name) return t.setValue(type.name);
				if (labels.types.some((x) => x.name === to)) { new Notice(`"${to}" already exists.`); return t.setValue(type.name); }
				renameType(labels, type.name, to);
				ctx.saveAndRedraw();
			});
		});
		confirmDelete(row, 'Delete type (its subscriptions keep going)', () => { deleteType(labels, type.name); ctx.saveAndRedraw(); });
	}
	let typeName = '';
	new Setting(types)
		.addText((t) => t.setPlaceholder('New type, e.g. Membership').onChange((v) => (typeName = v.trim())))
		.addButton((b) => b.setButtonText('Add').onClick(() => {
			if (!typeName || labels.types.some((x) => x.name === typeName)) return;
			labels.types.push({ name: typeName });
			ctx.saveAndRedraw();
		}));

	// Subscriptions.
	const list = collapsible(el, ctx, 'subscriptions', `Show ${countLabel(labels.subscriptions.length, 'subscription')}`);
	for (const sub of labels.subscriptions) subscriptionRow(list, sub, ctx);
	new Setting(list).addButton((b) => b.setButtonText('Add').onClick(() => {
		let n = 1;
		while (labels.subscriptions.some((s) => s.name === `New subscription ${n}`)) n++;
		addSubscription(labels, { name: `New subscription ${n}`, type: labels.types[0]?.name ?? '', match: '', amount: null, period: 'month', payments: null, paidBefore: 0, status: '' });
		ctx.saveAndRedraw();
	}));
}

// One subscription: name, type, text, amount, how often, out of, paid before, status, delete.
function subscriptionRow(el: HTMLElement, sub: Subscription, ctx: SettingsContext): void {
	const labels = ctx.plugin.db.labels;
	const used = ctx.rows.filter((t) => t.subscription === sub.name).length;
	const row = new Setting(el)
		.setClass('afm-wrap')
		.setDesc(sub.match ? countLabel(used, 'payment') : 'No text: matches nothing (only payments you pick)')
		.addText((t) => {
			t.setPlaceholder('Name').setValue(sub.name);
			t.inputEl.addEventListener('change', () => {
				const to = t.getValue().trim();
				if (!to || to === sub.name) return t.setValue(sub.name);
				if (labels.subscriptions.some((x) => x.name === to)) { new Notice(`"${to}" already exists.`); return t.setValue(sub.name); }
				renameSubscription(labels, sub.name, to);
				ctx.saveAndRedraw();
			});
		})
		.addDropdown((d) => {
			d.addOption('', 'No type');
			for (const t of labels.types) d.addOption(t.name, t.name);
			d.setValue(sub.type).onChange((v) => { sub.type = v; ctx.save(); });
		})
		.addText((t) => t.setPlaceholder('Description contains').setValue(sub.match).onChange((v) => { sub.match = v.trim(); ctx.save(); }))
		.addText((t) => t.setPlaceholder('Any amount').setValue(sub.amount === null ? '' : sub.amount.toFixed(2))
			.onChange((v) => { sub.amount = parseMoney(v); ctx.save(); }))
		.addDropdown((d) => d.addOptions(PERIOD_LABELS).setValue(sub.period).onChange((v) => { sub.period = v as Period; ctx.save(); }))
		.addText((t) => {
			t.setPlaceholder('Out of (empty = ongoing)').setValue(sub.payments ? String(sub.payments) : '')
				.onChange((v) => { sub.payments = parseInt(v) > 0 ? parseInt(v) : null; ctx.save(); });
			t.inputEl.title = 'Number of payments, e.g. 10 for instalments';
		})
		.addText((t) => {
			t.setPlaceholder('Paid before').setValue(sub.paidBefore ? String(sub.paidBefore) : '')
				.onChange((v) => { sub.paidBefore = Math.max(parseInt(v) || 0, 0); ctx.save(); });
			t.inputEl.title = 'Payments made before your statements start';
		})
		.addDropdown((d) => d.addOptions(STATUS_LABELS).setValue(sub.status).onChange((v) => { sub.status = v as SubscriptionStatus; ctx.save(); }));
	row.nameEl.setText(sub.name);
	confirmDelete(row, 'Delete subscription (its payments stay, without a name)', () => {
		deleteSubscription(labels, sub.name);
		ctx.saveAndRedraw();
	});
}
