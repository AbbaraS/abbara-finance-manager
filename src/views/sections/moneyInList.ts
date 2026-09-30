import { sum } from '../../models/monthSummary';
import { countsKind, rowKind, type RowKind } from '../../models/rowKind';
import { dayLabel } from '../../utils/dates';
import { formatMoney } from '../../utils/money';
import type { DashboardContext } from '../DashboardContext';
import { categoryButton } from './categoryButton';
import { noteLine } from './noteLine';
import { section } from './section';
import { tableHead } from './tableHead';

// How each row ends up in the totals, in words.
const COUNTS_AS: Record<RowKind, string> = { income: 'Income', fromPeople: 'From people', refund: 'Refund', spend: 'Spending', skip: 'Not counted' };

// This month's money in, except transfers, savings and refunds (refunds show under Spending by category).
export function moneyInList(el: HTMLElement, ctx: DashboardContext): void {
	// Data.
	const s = ctx.settings;
	const rows = ctx.rows.filter((t) => t.month === ctx.month && t.amount > 0 && t.currency === s.currency && countsKind(t) && rowKind(t, s) !== 'refund');
	const body = section(el, 'Money in', 'hand-coins');
	body.createDiv({ cls: 'afm-note', text: 'Only Income categories count as income. Money from People isn\'t income and isn\'t taken off spending. Refunds are under Spending by category; uncategorised money in isn\'t counted.' });
	if (rows.length === 0) {
		body.createDiv({ cls: 'afm-muted', text: 'No money in this month.' });
		return;
	}

	// Table.
	const table = body.createEl('table', { cls: 'afm-table' });
	tableHead(table, [
		{ text: 'Description' },
		{ text: 'Category', cls: 'afm-chip-cell' },
		{ text: 'Counts as', cls: 'afm-narrow-hide' },
		{ text: 'Amount', cls: 'afm-num' },
	]);

	// One row per payment; rows that aren't income are muted.
	const tbody = table.createEl('tbody');
	for (const t of rows) {
		const kind = rowKind(t, s);
		const tr = tbody.createEl('tr');
		tr.toggleClass('afm-not-income', kind !== 'income');
		const cell = tr.createEl('td');
		cell.createDiv({ text: t.description });
		cell.createDiv({ cls: 'afm-muted', text: `${dayLabel(t.date, s.locale)} · ${t.account}` });
		noteLine(cell, t);
		categoryButton(tr.createEl('td', { cls: 'afm-chip-cell' }), t, ctx);
		tr.createEl('td', { cls: 'afm-muted afm-narrow-hide', text: COUNTS_AS[kind] });
		tr.createEl('td', { cls: 'afm-num', text: formatMoney(t.amount, s) });
	}

	// Totals: income, then money from people when there is some.
	const foot = table.createEl('tfoot');
	for (const [label, kind] of [['Income', 'income'], ['From people', 'fromPeople']] as const) {
		const total = sum(rows.filter((t) => rowKind(t, s) === kind).map((t) => t.amount));
		if (kind === 'fromPeople' && total === 0) continue;
		const tr = foot.createEl('tr');
		tr.createEl('td', { text: label });
		tr.createEl('td', { cls: 'afm-chip-cell' });
		tr.createEl('td', { cls: 'afm-narrow-hide' });
		tr.createEl('td', { cls: 'afm-num', text: formatMoney(total, s) });
	}
}
