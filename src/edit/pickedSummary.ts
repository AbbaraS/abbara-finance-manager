import { Notice, setTooltip, type App } from 'obsidian';
import type { FinanceSettings } from '../models/FinanceSettings';
import { setLabel, type Labels } from '../models/Labels';
import { keptOf, linkBack, linkedByYou, notGivenBack, purchasesFor, setBackAmount, unlinkBack } from '../models/linkRefunds';
import type { Transaction } from '../models/Transaction';
import { countLabel } from '../utils/countLabel';
import { dayLabel } from '../utils/dates';
import { formatChange, formatMoney, parseMoney } from '../utils/money';
import { PurchasePicker } from './PurchasePicker';

// Where the category came from, in words.
const SOURCE_TEXT = { edit: 'one-off edit', rule: 'from its recipient', person: 'found by the person\'s spellings', pair: 'other side of a transfer', refund: 'same as the purchase it refunds', none: '' };

// Box at the top of the window describing what's being changed. For one transaction, also its money back links (refunds
// and paybacks from people), each with Unlink, ones unlinked by hand with Link again, and for money in "Pays back a purchase…".
// `change` makes the change, saves straight away and redraws the window with `notice`.
export function pickedSummary(app: App, el: HTMLElement, picked: Transaction[], s: FinanceSettings, labels: Labels, rows: Transaction[],
	change: (make: () => void, notice: string) => void): void {
	const box = el.createDiv({ cls: 'afm-picked' });
	const first = picked[0];
	const one = picked.length === 1;

	// Name and amount on top; then date with year, the account ("From" for money out, "Into" for money in), the bank's description.
	const top = box.createDiv({ cls: 'afm-picked-top' });
	const left = top.createDiv({ cls: 'afm-picked-main' });
	const name = one ? first.person || first.subscription || first.counterparty || first.description : countLabel(picked.length);
	left.createDiv({ cls: 'afm-picked-title', text: name });
	const total = picked.reduce((a, t) => a + t.amount, 0);
	top.createDiv({ cls: `afm-picked-amount ${total < 0 ? 'afm-flow-out' : 'afm-flow-in'}`, text: formatChange(total, s) });

	const accounts = [...new Set(picked.map((t) => t.account))].join(', ');
	const dir = picked.every((t) => t.amount < 0) ? 'From' : picked.every((t) => t.amount > 0) ? 'Into' : 'Account';
	const when = one ? `${dayLabel(first.date, s.locale)} ${first.date.slice(0, 4)}` : dateRange(picked, s);
	const meta = left.createDiv({ cls: 'afm-picked-meta' });
	meta.createSpan({ text: when });
	meta.createSpan({ text: `${dir}: ${accounts}` });
	if (one) box.createDiv({ cls: 'afm-picked-desc', text: first.description, attr: { title: 'Description from the bank statement' } });

	const source = SOURCE_TEXT[first.source];
	const now = [first.category, first.person, first.subcategory].filter(Boolean).join(' › ');
	const line = box.createDiv({ cls: 'afm-muted afm-picked-now' });
	line.setText(`Now in ${now}${source ? ` (${source})` : ''}`);
	if (first.counterparty && picked.every((t) => t.counterparty === first.counterparty) && name !== first.counterparty) line.appendText(` · Recipient: ${first.counterparty}`);
	if (picked.length !== 1) return;

	// Money back links: linked ones (yours with an amount to change), then ones you unlinked; for money in, a way to link one.
	const byId = new Map(rows.map((t) => [t.id, t]));
	const links: [string, Transaction, string, string, boolean, number][] = []; // label, other row, refund id, purchase id, linked, part
	for (const p of rows) {
		const part = p.refunds.find((r) => r.t.id === first.id);
		if (part) links.push([first.person ? 'Pays back' : 'Refund of', p, first.id, p.id, true, part.amount]);
	}
	for (const r of first.refunds) links.push([r.t.person ? `Paid back by ${r.t.person}` : 'Refunded by', r.t, r.t.id, first.id, true, r.amount]);
	for (const id of labels.transactions[first.id]?.notRefundOf ?? []) {
		const p = byId.get(id);
		if (p) links.push(['Not a refund of', p, first.id, id, false, 0]);
	}
	for (const [id, l] of Object.entries(labels.transactions)) {
		const r = byId.get(id);
		if (r && l.notRefundOf?.includes(first.id)) links.push(['Not refunded by', r, id, first.id, false, 0]);
	}
	const canLink = first.amount > 0 && first.kind !== 'transfer' && first.kind !== 'saving' && notGivenBack(first) > 0;
	if (links.length === 0 && !canLink) return;

	const list = box.createDiv({ cls: 'afm-refund-links' });
	for (const [label, t, refund, purchase, linked, part] of links) {
		const row = list.createDiv({ cls: `afm-refund-link${linked ? '' : ' is-unlinked'}` });
		const text = row.createDiv({ cls: 'afm-refund-link-text' });
		text.createDiv({ text: `${label}: ${t.counterparty || t.description}` });
		const whole = Math.abs(t.amount) - Math.abs(part) > 0.005 && linked ? ` · ${formatMoney(part, s)} of it` : '';
		text.createDiv({ cls: 'afm-muted', text: `${dayLabel(t.date, s.locale)} ${t.date.slice(0, 4)} · ${t.account} · ${formatChange(t.amount, s)}${whole}` });
		const yours = linked && linkedByYou(labels, refund, purchase);
		if (yours) { // how much of the payment goes to this purchase
			const input = row.createEl('input', { cls: 'afm-link-amount', attr: { type: 'number', step: '0.01', min: '0.01', 'aria-label': 'Amount' } });
			input.value = part.toFixed(2);
			input.addEventListener('change', () => {
				const v = parseMoney(input.value);
				const payment = byId.get(refund), bought = byId.get(purchase);
				const most = payment && bought ? Math.min(notGivenBack(payment) + part, keptOf(bought) + part) : part;
				if (v === null || v <= 0 || v > most + 0.005) {
					input.value = part.toFixed(2);
					return void new Notice(`Pick an amount from 0.01 to ${formatMoney(most, s)}.`);
				}
				change(() => setBackAmount(labels, refund, purchase, v), 'Amount changed.');
			});
		}
		const btn = row.createEl('button', { text: linked ? 'Unlink' : 'Link again' });
		btn.addEventListener('click', () => {
			if (yours) return change(() => unlinkBack(labels, refund, purchase), 'Unlinked.');
			const now = labels.transactions[refund]?.notRefundOf ?? [];
			change(() => setLabel(labels, refund, { notRefundOf: linked ? [...new Set([...now, purchase])] : now.filter((id) => id !== purchase) }),
				linked ? 'Unlinked: no longer counted as its refund.' : 'Linked again where it still fits.');
		});
	}

	// Link this payment to a purchase it pays back (Mum's £55 for sandals bought with yours).
	if (canLink) {
		const add = list.createEl('button', { cls: 'afm-link-purchase', text: links.length ? 'Pays back another purchase…' : 'Pays back a purchase…' });
		setTooltip(add, 'Link this money to something you bought for them. It comes off that purchase (in its month), not counted as money from people.');
		add.addEventListener('click', () => new PurchasePicker(app, purchasesFor(rows, first), s,
			(p) => change(() => linkBack(labels, first, p), `Linked to ${p.counterparty || p.description}.`)).open());
	}
}

// "3 Sept – 25 Sept 2025" for several rows.
function dateRange(picked: Transaction[], s: FinanceSettings): string {
	const dates = picked.map((t) => t.date).sort();
	const [a, b] = [dates[0], dates[dates.length - 1]];
	return a === b ? `${dayLabel(a, s.locale)} ${a.slice(0, 4)}` : `${dayLabel(a, s.locale)}${a.slice(0, 4) === b.slice(0, 4) ? '' : ` ${a.slice(0, 4)}`} – ${dayLabel(b, s.locale)} ${b.slice(0, 4)}`;
}
