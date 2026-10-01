import { Notice, Setting } from 'obsidian';
import { PERIOD_LABELS, STATUS_LABELS, type Period, type Subscription, type SubscriptionStatus } from '../../models/Subscription';
import { addSubscription, deleteSubscription, deleteType, renameSubscription, renameType } from '../../models/subscriptions';
import { countLabel } from '../../utils/countLabel';
import { formatMoney, parseMoney } from '../../utils/money';
import { setIconSafe } from '../../views/look/setIconSafe';
import { tagInput } from '../../edit/tagInput';
import { tagNames } from '../../models/Labels';
import { collapsible } from '../collapsible';
import { confirmDelete } from '../confirmDelete';
import type { SettingsContext } from '../context';

// Types (Subscription, Instalments...) and your subscriptions with how they're matched, collapsed.
export function subscriptionsSection(el: HTMLElement, ctx: SettingsContext): void {
	const labels = ctx.plugin.db.labels;
	new Setting(el)
		.setName('Subscriptions')
		.setDesc('A payment gets a subscription when it\'s with its counterparty and, if set, has its amount and extra text. When two fit, the one due nearest the date wins. The category still comes from the counterparty. Name new ones from the edit window.')
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
		addSubscription(labels, { name: `New subscription ${n}`, type: labels.types[0]?.name ?? '', counterparty: '', match: '', amount: null, period: 'month', payments: null, paidBefore: 0, status: '' });
		ctx.saveAndRedraw();
	}));

	// Look-alikes you said aren't subscriptions, as chips; × shows one on the dashboard again.
	const st = ctx.plugin.settings;
	if (st.hiddenRepeats.length === 0) return;
	const hidden = new Setting(el).setName('Not subscriptions').setDesc('Hidden from "Look like subscriptions". Remove one to see it there again.');
	const chips = hidden.descEl.createDiv({ cls: 'afm-chips' });
	for (const key of st.hiddenRepeats) {
		const [text, amount] = key.split('|');
		const chip = chips.createSpan({ cls: 'afm-tag', text: `${text} · ${formatMoney(-Number(amount), st)}` });
		const remove = chip.createSpan({ cls: 'afm-tag-remove', attr: { 'aria-label': 'Show again' } });
		setIconSafe(remove, 'x');
		remove.addEventListener('click', () => {
			st.hiddenRepeats = st.hiddenRepeats.filter((k) => k !== key);
			ctx.saveAndRedraw();
		});
	}
}

// One subscription: name, type, counterparty, extra text, amount, how often, out of, paid before, status, tags, delete.
function subscriptionRow(el: HTMLElement, sub: Subscription, ctx: SettingsContext): void {
	const labels = ctx.plugin.db.labels;
	const used = ctx.rows.filter((t) => t.subscription === sub.name).length;
	const row = new Setting(el)
		.setClass('afm-wrap')
		.setDesc(sub.counterparty || sub.match ? countLabel(used, 'payment') : 'No counterparty or text: matches nothing (only payments you pick)')
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
		.addDropdown((d) => {
			d.addOption('', 'No counterparty');
			for (const cp of [...labels.counterparties].sort((a, b) => a.name.localeCompare(b.name))) d.addOption(cp.name, cp.name);
			d.setValue(sub.counterparty).onChange((v) => { sub.counterparty = v; ctx.saveAndRedraw(); });
		})
		.addText((t) => {
			t.setPlaceholder(sub.counterparty ? 'Also contains (optional)' : 'Description contains').setValue(sub.match)
				.onChange((v) => { sub.match = v.trim(); ctx.save(); });
			t.inputEl.title = 'Text in the description. With a counterparty, only needed to tell apart two plans at the same price.';
		})
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
	tagInput(ctx.app, row.controlEl, sub.tags ?? [], tagNames(labels), (tags) => { sub.tags = tags; ctx.save(); });
	row.nameEl.setText(sub.name);
	confirmDelete(row, 'Delete subscription (its payments stay, without a name)', () => {
		deleteSubscription(labels, sub.name);
		ctx.saveAndRedraw();
	});
}
