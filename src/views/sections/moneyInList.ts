import { sum } from '../../models/monthSummary';
import { rowKind } from '../../models/rowKind';
import { dayLabel } from '../../utils/dates';
import { formatMoney } from '../../utils/money';
import type { DashboardContext } from '../DashboardContext';
import { categoryButton } from './categoryButton';
import { noteLine } from './noteLine';
import { rowName } from './rowName';
import { tableHead } from './tableHead';

// This month's income: money in under Income categories only. Money from people is under People, refunds under
// Spending by category, and uncategorised money in under Uncategorised.
export function moneyInList(body: HTMLElement, ctx: DashboardContext): void {
	// Data.
	const s = ctx.settings;
	const rows = ctx.rows.filter((t) => t.month === ctx.month && rowKind(t, s) === 'income').sort((a, b) => b.amount - a.amount);
	if (rows.length === 0) {
		body.createDiv({ cls: 'afm-muted', text: 'No income this month.' });
		return;
	}

	// Table.
	const table = body.createEl('table', { cls: 'afm-table' });
	tableHead(table, [
		{ text: 'From' },
		{ text: 'Category', cls: 'afm-chip-cell' },
		{ text: 'Amount', cls: 'afm-num' },
	]);

	// One row per payment; click it to open it.
	const tbody = table.createEl('tbody');
	for (const t of rows) {
		const tr = tbody.createEl('tr', { cls: 'afm-clickable' });
		const cell = tr.createEl('td');
		rowName(cell, t);
		cell.createDiv({ cls: 'afm-muted', text: `${dayLabel(t.date, s.locale)} · ${t.account}` });
		noteLine(cell, t, ctx);
		categoryButton(tr.createEl('td', { cls: 'afm-chip-cell' }), t, ctx);
		tr.createEl('td', { cls: 'afm-num', text: formatMoney(t.amount, s) });
		tr.addEventListener('click', () => ctx.editCategory([t], false));
	}

	// Total.
	const foot = table.createEl('tfoot').createEl('tr');
	foot.createEl('td', { text: 'Income' });
	foot.createEl('td', { cls: 'afm-chip-cell' });
	foot.createEl('td', { cls: 'afm-num', text: formatMoney(sum(rows.map((t) => t.amount)), s) });
}
