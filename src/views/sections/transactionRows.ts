import type { Transaction } from '../../models/Transaction';
import { dayLabel } from '../../utils/dates';
import { formatMoney } from '../../utils/money';
import type { DashboardContext } from '../DashboardContext';
import { categoryButton } from './categoryButton';
import { noteLine } from './noteLine';
import { subscriptionChip } from './subscriptionChip';

// Adds one detail row per transaction (same 4 columns as the table) and returns them. `depth` indents rows under subcategories.
export function transactionRows(tbody: HTMLElement, rows: Transaction[], ctx: DashboardContext, depth = 1): HTMLElement[] {
	const s = ctx.settings;
	return rows.map((t) => {
		const tr = tbody.createEl('tr', { cls: 'afm-detail' });
		tr.setCssProps({ '--afm-depth': String(depth) });
		const cell = tr.createEl('td');
		cell.createDiv({ text: t.description });
		const meta = cell.createDiv({ cls: 'afm-meta' });
		meta.createSpan({ cls: 'afm-muted', text: `${dayLabel(t.date, s.locale)} · ${t.account}` });
		categoryButton(meta, t, ctx);
		subscriptionChip(meta, t, ctx);
		noteLine(cell, t, ctx);
		tr.createEl('td', { cls: 'afm-bar-cell' });
		tr.createEl('td', { cls: 'afm-num', text: formatMoney(-t.amount, s) }); // spend shows positive, refunds negative
		tr.createEl('td');
		return tr;
	});
}
