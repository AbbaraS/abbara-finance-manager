import type { FinanceSettings } from '../models/FinanceSettings';
import type { Transaction } from '../models/Transaction';
import { countLabel } from '../utils/countLabel';
import { dayLabel } from '../utils/dates';
import { formatChange } from '../utils/money';

// Where the category came from, in words.
const SOURCE_TEXT = { edit: 'one-off edit', rule: 'from its counterparty', person: 'found by the person\'s spellings', pair: 'other side of a transfer', none: '' };

// Box at the top of the window describing what's being changed.
export function pickedSummary(el: HTMLElement, picked: Transaction[], s: FinanceSettings): void {
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
}
