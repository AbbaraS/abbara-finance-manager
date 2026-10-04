import type { FinanceSettings } from '../models/FinanceSettings';
import type { Labels } from '../models/Labels';
import type { Transaction } from '../models/Transaction';
import { countLabel } from '../utils/countLabel';
import { dayLabel } from '../utils/dates';
import { formatChange } from '../utils/money';

// Where the category came from, in words.
const SOURCE_TEXT = { edit: 'one-off edit', rule: 'from its counterparty', person: 'found by the person\'s spellings', pair: 'other side of a transfer', refund: 'same as the purchase it refunds', none: '' };

// Box at the top of the window describing what's being changed. For one transaction, also its refund links, each with
// an Unlink button, and ones unlinked by hand with Link again (`relink(refund id, purchase id, unlink)`).
export function pickedSummary(el: HTMLElement, picked: Transaction[], s: FinanceSettings, labels: Labels, rows: Transaction[],
	relink: (refund: string, purchase: string, unlink: boolean) => void): void {
	const box = el.createDiv({ cls: 'afm-picked' });
	const first = picked[0];
	box.createDiv({ cls: 'afm-picked-title', text: first.description });
	if (picked.every((t) => t.counterparty === first.counterparty) && first.counterparty) box.createDiv({ cls: 'afm-muted', text: `Counterparty: ${first.counterparty}` });

	const total = picked.reduce((a, t) => a + t.amount, 0);
	const accounts = [...new Set(picked.map((t) => t.account))].join(', ');
	const when = picked.length === 1 ? dayLabel(first.date, s.locale) : countLabel(picked.length);
	box.createDiv({ cls: 'afm-muted', text: `${when} · ${accounts} · ${formatChange(total, s)}` });

	const source = SOURCE_TEXT[first.source];
	const now = [first.category, first.person, first.subcategory].filter(Boolean).join(' › ');
	box.createDiv({ cls: 'afm-muted', text: `Now: ${now}${source ? ` (${source})` : ''}` });
	if (picked.length !== 1) return;

	// Refund links: linked ones, then ones you unlinked.
	const byId = new Map(rows.map((t) => [t.id, t]));
	const links: [string, Transaction, string, string, boolean][] = []; // label, other row, refund id, purchase id, linked
	if (first.refundOf) links.push(['Refund of', first.refundOf, first.id, first.refundOf.id, true]);
	for (const r of first.refunds) links.push(['Refunded by', r, r.id, first.id, true]);
	for (const id of labels.transactions[first.id]?.notRefundOf ?? []) {
		const p = byId.get(id);
		if (p) links.push(['Not a refund of', p, first.id, id, false]);
	}
	for (const [id, l] of Object.entries(labels.transactions)) {
		const r = byId.get(id);
		if (r && l.notRefundOf?.includes(first.id)) links.push(['Not refunded by', r, id, first.id, false]);
	}
	if (links.length === 0) return;
	const list = box.createDiv({ cls: 'afm-refund-links' });
	for (const [label, t, refund, purchase, linked] of links) {
		const row = list.createDiv({ cls: `afm-refund-link${linked ? '' : ' is-unlinked'}` });
		const text = row.createDiv({ cls: 'afm-refund-link-text' });
		text.createDiv({ text: `${label}: ${t.description}` });
		text.createDiv({ cls: 'afm-muted', text: `${dayLabel(t.date, s.locale)} · ${t.account} · ${formatChange(t.amount, s)}` });
		const btn = row.createEl('button', { text: linked ? 'Unlink' : 'Link again' });
		btn.addEventListener('click', () => relink(refund, purchase, linked));
	}
}
