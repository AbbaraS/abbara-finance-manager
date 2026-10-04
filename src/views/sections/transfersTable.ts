import { setTooltip } from 'obsidian';
import { transferFlows, type FlowMonth } from '../../models/transferFlows';
import { countLabel } from '../../utils/countLabel';
import { monthLabel } from '../../utils/dates';
import { formatMoney, formatTidy } from '../../utils/money';
import { monthWindow } from '../../utils/monthWindow';
import type { DashboardContext } from '../DashboardContext';
import { accountName } from './accountName';
import { expandable } from './expandable';
import { tableHead } from './tableHead';
import { transferRows } from './transferRows';

// How many months the table shows.
const MONTHS = 6;

// Money moved between your own accounts: one row per pair of accounts (one above the other), with arrows in each month
// showing which way the money went. Fits the pane: on narrow panes the months furthest from the chosen one are hidden.
export function transfersTable(body: HTMLElement, ctx: DashboardContext): void {
	// Data: flows with money in the months shown.
	const s = ctx.settings;
	const months = monthWindow(ctx.months, ctx.month, MONTHS);
	const flows = transferFlows(ctx.rows, s).filter((f) => months.some((m) => f.months.has(m)));
	if (flows.length === 0) {
		body.createDiv({ cls: 'afm-muted', text: 'No transfers in these months. Put transfers in a Transfers category.' });
		return;
	}
	body.createDiv({ cls: 'afm-note', text: 'Money moved between your own accounts, each transfer counted once. ↓ is money from the top account to the one under it, ↑ the other way. Open a row to see this month\'s transfers.' });

	// Months closest to the chosen one hide last (rank 0 = the chosen month; ties keep the newer month).
	const chosen = months.indexOf(ctx.month);
	const order = months.map((_, i) => i).sort((a, b) => Math.abs(a - chosen) - Math.abs(b - chosen) || b - a);
	const monthCls = (i: number) => `afm-num afm-rank-${order.indexOf(i)}${i === chosen ? ' is-selected' : ''}`;

	// Table.
	const table = body.createDiv({ cls: 'afm-flows-wrap' }).createEl('table', { cls: 'afm-table afm-flows' });
	tableHead(table, [
		{ text: 'Accounts' },
		...months.map((m, i) => ({ text: monthLabel(m, s.locale, true), cls: monthCls(i) })),
		{ text: `${months.length} months`, cls: 'afm-num afm-flow-total' },
	]);
	setTooltip(table.querySelector('th.afm-flow-total') as HTMLElement, `Total of all ${months.length} months, also ones hidden on a narrow pane`);

	// Cells are tinted by size, relative to the biggest cell.
	const max = Math.max(...flows.flatMap((f) => months.map((m) => moved(f.months.get(m)))));
	const tbody = table.createEl('tbody');
	for (const f of flows) {
		const tr = tbody.createEl('tr');
		const first = tr.createEl('td').createDiv({ cls: 'afm-row-title' });
		const icon = first.createSpan({ cls: 'afm-chevron' });
		const pair = first.createDiv({ cls: 'afm-flow-pair' });
		accountName(pair, f.left);
		accountName(pair, f.right);

		// Months shown, then the total.
		const shown: FlowMonth = { there: 0, back: 0, rows: [] };
		months.forEach((m, i) => {
			const cell = f.months.get(m);
			const td = tr.createEl('td', { cls: `${monthCls(i)} afm-heat` });
			if (!cell) return void td.setText('–');
			shown.there += cell.there;
			shown.back += cell.back;
			arrows(td, cell, ctx);
			td.setCssProps({ '--afm-heat': `${Math.round(8 + (moved(cell) / max) * 40)}%` });
			setTooltip(td, `${monthLabel(m, s.locale)} · ${countLabel(cell.rows.length, 'transfer')}${netText(cell, f.left, f.right, ctx)}`);
		});
		const total = tr.createEl('td', { cls: 'afm-num afm-strong afm-flow-total' });
		arrows(total, shown, ctx);
		if (shown.there && shown.back) total.createDiv({ cls: 'afm-flow-net', text: `net ${shown.there >= shown.back ? '↓' : '↑'} ${formatTidy(Math.abs(shown.there - shown.back), ctx.settings)}` });

		const details = transferRows(tbody, f, f.months.get(ctx.month)?.rows ?? [], months.length + 2, ctx);
		expandable(tr, icon, details, `flow:${f.left}⇄${f.right}`, ctx.expanded);
	}
}

// Both directions in one cell: "↓ £500" over "↑ £400"; one line when money only went one way.
function arrows(td: HTMLElement, cell: FlowMonth, ctx: DashboardContext): void {
	for (const [amount, arrow] of [[cell.there, '↓'], [cell.back, '↑']] as const) {
		if (!amount) continue;
		const line = td.createDiv({ cls: 'afm-flow-amount' });
		line.createSpan({ cls: 'afm-flow-arrow', text: arrow });
		line.createSpan({ text: formatTidy(amount, ctx.settings) });
	}
}

// Total moved either way.
function moved(cell: FlowMonth | undefined): number {
	return (cell?.there ?? 0) + (cell?.back ?? 0);
}

// " · net £100 to barclays - saving" when money went both ways.
function netText(cell: FlowMonth, left: string, right: string, ctx: DashboardContext): string {
	if (!cell.there || !cell.back) return '';
	const net = cell.there - cell.back;
	return ` · net ${formatMoney(Math.abs(net), ctx.settings)} to ${net >= 0 ? right : left}`;
}
