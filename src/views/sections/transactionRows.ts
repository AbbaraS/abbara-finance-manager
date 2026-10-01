import type { Transaction } from '../../models/Transaction';
import { dayLabel } from '../../utils/dates';
import { formatMoney } from '../../utils/money';
import type { DashboardContext } from '../DashboardContext';
import { categoryButton } from './categoryButton';
import { noteLine } from './noteLine';
import { rowName } from './rowName';
import { subscriptionChip } from './subscriptionChip';

// Adds one detail row per transaction (same 4 columns as the table) and returns them; click one to open it.
// `depth` indents rows under subcategories.
export function transactionRows(tbody: HTMLElement, rows: Transaction[], ctx: DashboardContext, depth = 1): HTMLElement[] {
	const s = ctx.settings;
	return rows.map((t) => {
		const tr = tbody.createEl('tr', { cls: 'afm-detail afm-clickable' });
		tr.setCssProps({ '--afm-depth': String(depth) });
		const cell = tr.createEl('td');
		rowName(cell, t);
		const meta = cell.createDiv({ cls: 'afm-meta' });
		meta.createSpan({ cls: 'afm-muted', text: `${dayLabel(t.date, s.locale)} · ${t.account}` });
		categoryButton(meta, t, ctx);
		subscriptionChip(meta, t, ctx);
		noteLine(cell, t, ctx);
		tr.createEl('td', { cls: 'afm-bar-cell' });
		tr.createEl('td', { cls: 'afm-num', text: formatMoney(-t.amount, s) }); // spend shows positive, refunds negative
		tr.createEl('td');
		tr.addEventListener('click', () => ctx.editCategory([t], false));
		return tr;
	});
}
