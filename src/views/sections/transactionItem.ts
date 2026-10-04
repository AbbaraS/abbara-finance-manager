import { setTooltip } from 'obsidian';
import { fullyRefunded, keptOf } from '../../models/linkRefunds';
import type { FinanceSettings } from '../../models/FinanceSettings';
import type { Transaction } from '../../models/Transaction';
import { dayLabel } from '../../utils/dates';
import { formatMoney, formatTidy } from '../../utils/money';
import type { DashboardContext } from '../DashboardContext';
import { setIconSafe } from '../look/setIconSafe';
import { refundBadge } from './refundBadge';
import { rowName } from './rowName';
import { subscriptionChip } from './subscriptionChip';

// One transaction inside a card: name and `amount` on top, then date, account, chips, tags and note on one wrapping line.
// `merged` are its refunds listed in the same card: shown under it instead of as rows of their own.
// Click it to open the edit window. A fully refunded purchase is one faded line; click it to see its details and an Edit button.
export function transactionItem(parent: HTMLElement, t: Transaction, ctx: DashboardContext, amount: string, merged: Transaction[] = []): void {
	const s = ctx.settings;
	const faded = fullyRefunded(t);
	const item = parent.createDiv({ cls: `afm-item${faded ? ' is-refunded' : ''}`, attr: { tabindex: '0', role: 'button' } });
	const top = item.createDiv({ cls: 'afm-item-top' });
	const name = top.createDiv({ cls: 'afm-item-name' });
	rowName(name, t);
	if (faded) refundBadge(name, t, ctx);
	const money = top.createDiv({ cls: 'afm-item-amount' });
	money.createSpan({ cls: t.refunds.length ? 'afm-struck' : '', text: amount });
	if (t.refunds.length && !faded) money.createDiv({ cls: 'afm-item-kept', text: formatMoney(keptOf(t), s) });

	// Date, account and the rest.
	const details = item.createDiv({ cls: 'afm-item-details' });
	const meta = details.createDiv({ cls: 'afm-item-meta' });
	meta.createSpan({ text: `${dayLabel(t.date, s.locale)} · ${t.account}` });
	subscriptionChip(meta, t, ctx);
	if (!faded) refundBadge(meta, t, ctx);
	debtChip(meta, t, s);
	for (const tag of t.autoTags) meta.createSpan({ cls: 'afm-tag afm-tag-auto', text: `#${tag}` });
	for (const tag of t.tags) meta.createSpan({ cls: 'afm-tag', text: `#${tag}` });
	if (t.note) {
		const note = meta.createSpan({ cls: 'afm-item-note' });
		setIconSafe(note.createSpan({ cls: 'afm-note-icon' }), 'message-square');
		note.createSpan({ text: t.note });
	}

	// Its refunds in this card.
	for (const r of merged) {
		const line = details.createDiv({ cls: 'afm-refund-line' });
		setIconSafe(line.createSpan({ cls: 'afm-note-icon' }), 'undo-2');
		line.createSpan({ text: `${formatMoney(r.amount, s)} back · ${dayLabel(r.date, s.locale)}` });
	}

	// Click: edit, or for a faded one show / hide its details (remembered across redraws).
	const key = `item:${t.id}`;
	if (faded) {
		details.toggleClass('afm-hidden', !ctx.expanded.has(key));
		const edit = meta.createEl('button', { cls: 'afm-item-edit', text: 'Edit' });
		edit.addEventListener('click', (e) => {
			e.stopPropagation();
			ctx.editCategory([t], false);
		});
	}
	const open = () => {
		if (!faded) return ctx.editCategory([t], false);
		if (ctx.expanded.has(key)) ctx.expanded.delete(key);
		else ctx.expanded.add(key);
		details.toggleClass('afm-hidden', !ctx.expanded.has(key));
	};
	item.addEventListener('click', open);
	item.addEventListener('keydown', (e) => {
		if (e.key === 'Enter' && e.target === item) open();
	});
}

// "Borrowed" / "Paid back" on a transaction that counts towards what you owe a person; "£205 paid back" when only part of it does.
// Starts with the debt's reason, e.g. "Car · Paid back".
export function debtChip(parent: HTMLElement, t: Transaction, s: FinanceSettings): void {
	if (!t.debt) return;
	const d = t.debt;
	const part = Math.abs(d.amount) < Math.abs(t.amount) - 0.005;
	const what = d.amount > 0 ? 'borrowed' : 'paid back';
	const text = part ? `${formatTidy(Math.abs(d.amount), s)} ${what}` : what[0].toUpperCase() + what.slice(1);
	const el = parent.createSpan({ cls: `afm-debt-chip ${d.amount > 0 ? 'is-borrowed' : 'is-paid'}`, text: d.reason ? `${d.reason} · ${text}` : text });
	setTooltip(el, `${formatMoney(Math.abs(d.amount), s)} of ${formatMoney(Math.abs(t.amount), s)} counts towards what you owe ${d.person}${d.reason ? ` for ${d.reason}` : ''}`);
}
