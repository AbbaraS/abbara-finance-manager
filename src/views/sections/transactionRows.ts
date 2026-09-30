import type { Transaction } from '../../models/Transaction';
import { dayLabel } from '../../utils/dates';
import { formatMoney } from '../../utils/money';
import type { DashboardContext } from '../DashboardContext';
import { categoryButton } from './categoryButton';
import { noteLine } from './noteLine';

// Adds one detail row per transaction (same 4 columns as the table) and returns them.
export function transactionRows(tbody: HTMLElement, rows: Transaction[], ctx: DashboardContext): HTMLElement[] {
	const s = ctx.settings;
	return rows.map((t) => {
		const tr = tbody.createEl('tr', { cls: 'afm-detail' });
		const cell = tr.createEl('td');
		cell.createDiv({ text: t.description });
		const meta = cell.createDiv({ cls: 'afm-meta' });
		meta.createSpan({ cls: 'afm-muted', text: `${dayLabel(t.date, s.locale)} · ${t.account}` });
		categoryButton(meta, t, ctx);
		noteLine(cell, t);
		tr.createEl('td', { cls: 'afm-bar-cell' });
		tr.createEl('td', { cls: 'afm-num', text: formatMoney(-t.amount, s) }); // spend shows positive, refunds negative
		tr.createEl('td');
		return tr;
	});
}
