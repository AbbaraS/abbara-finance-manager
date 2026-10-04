import { fullyRefunded } from '../../models/linkRefunds';
import type { Transaction } from '../../models/Transaction';
import { dayLabel } from '../../utils/dates';
import { formatMoney } from '../../utils/money';
import type { DashboardContext } from '../DashboardContext';
import { categoryButton } from './categoryButton';
import { noteLine } from './noteLine';
import { refundBadge } from './refundBadge';
import { rowName } from './rowName';
import { subscriptionChip } from './subscriptionChip';
import { debtChip } from './transactionItem';

// Adds one detail row per transaction (same 4 columns as the table) and returns them; click one to open it.
// A fully refunded purchase is one faded line; click it to show its details, then again to open it. `depth` indents rows under subcategories.
export function transactionRows(tbody: HTMLElement, rows: Transaction[], ctx: DashboardContext, depth = 1): HTMLElement[] {
	const s = ctx.settings;
	return rows.map((t) => {
		const faded = fullyRefunded(t);
		const tr = tbody.createEl('tr', { cls: `afm-detail afm-clickable${faded ? ' is-refunded' : ''}` });
		tr.setCssProps({ '--afm-depth': String(depth) });
		const cell = tr.createEl('td');
		const name = cell.createDiv({ cls: 'afm-item-name' });
		rowName(name, t);
		if (faded) refundBadge(name, t, ctx);
		const details = cell.createDiv();
		const meta = details.createDiv({ cls: 'afm-meta' });
		meta.createSpan({ cls: 'afm-muted', text: `${dayLabel(t.date, s.locale)} · ${t.account}` });
		categoryButton(meta, t, ctx);
		subscriptionChip(meta, t, ctx);
		if (!faded) refundBadge(meta, t, ctx);
		debtChip(meta, t, s);
		noteLine(details, t, ctx);
		tr.createEl('td', { cls: 'afm-bar-cell' });
		tr.createEl('td', { cls: `afm-num${faded ? ' afm-struck' : ''}`, text: formatMoney(-t.amount, s) }); // spend shows positive, refunds negative
		tr.createEl('td');

		// Faded rows open in two steps: details first.
		const key = `item:${t.id}`;
		if (faded) details.toggleClass('afm-hidden', !ctx.expanded.has(key));
		tr.addEventListener('click', () => {
			if (!faded || ctx.expanded.has(key)) return ctx.editCategory([t], false);
			ctx.expanded.add(key);
			details.removeClass('afm-hidden');
		});
		return tr;
	});
}
