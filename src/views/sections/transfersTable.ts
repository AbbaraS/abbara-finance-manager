import { setTooltip } from 'obsidian';
import { transferFlows } from '../../models/transferFlows';
import { countLabel } from '../../utils/countLabel';
import { monthLabel } from '../../utils/dates';
import { formatMoney } from '../../utils/money';
import { monthWindow } from '../../utils/monthWindow';
import type { DashboardContext } from '../DashboardContext';
import { expandable } from './expandable';
import { flowName } from './flowName';
import { section } from './section';
import { tableHead } from './tableHead';
import { transferRows } from './transferRows';

// How many months the table shows.
const MONTHS = 6;

// Money moved between your own accounts, one row per direction, one column per month.
export function transfersTable(el: HTMLElement, ctx: DashboardContext): void {
	// Data: flows with money in the months shown.
	const s = ctx.settings;
	const months = monthWindow(ctx.months, ctx.month, MONTHS);
	const flows = transferFlows(ctx.rows, s, ctx.labels.accounts).filter((f) => months.some((m) => f.months.has(m)));
	const body = section(el, 'Transfers between accounts', 'arrow-left-right');
	if (flows.length === 0) {
		body.createDiv({ cls: 'afm-muted', text: 'No transfers in these months. Put transfers in a Transfers category.' });
		return;
	}
	body.createDiv({ cls: 'afm-note', text: 'The other account is found by matching amounts, or by an account\'s match text (settings). Click a row to see this month\'s transfers and move one.' });

	// Table (scrolls sideways on narrow panes).
	const table = body.createDiv({ cls: 'afm-scroll' }).createEl('table', { cls: 'afm-table afm-flows' });
	tableHead(table, [
		{ text: 'From → to' },
		...months.map((m) => ({ text: monthLabel(m, s.locale, true), cls: `afm-num${m === ctx.month ? ' is-selected' : ''}` })),
		{ text: 'Total', cls: 'afm-num' },
	]);

	// Cells are tinted by size, relative to the biggest cell.
	const max = Math.max(...flows.flatMap((f) => months.map((m) => f.months.get(m)?.amount ?? 0)));
	const tbody = table.createEl('tbody');
	for (const f of flows) {
		const tr = tbody.createEl('tr');
		const name = tr.createEl('td').createDiv({ cls: 'afm-row-title' });
		const icon = name.createSpan({ cls: 'afm-chevron' });
		flowName(name, f.from, f.to);

		let total = 0;
		for (const m of months) {
			const cell = f.months.get(m);
			total += cell?.amount ?? 0;
			const td = tr.createEl('td', { cls: `afm-num afm-heat${m === ctx.month ? ' is-selected' : ''}`, text: cell ? formatMoney(cell.amount, s) : '–' });
			if (!cell) continue;
			td.setCssProps({ '--afm-heat': `${Math.round(8 + (cell.amount / max) * 40)}%` });
			setTooltip(td, `${monthLabel(m, s.locale)} · ${countLabel(cell.rows.length, 'transfer')}`);
		}
		tr.createEl('td', { cls: 'afm-num afm-strong', text: formatMoney(total, s) });

		const details = transferRows(tbody, f.months.get(ctx.month)?.rows ?? [], months.length + 2, ctx);
		expandable(tr, icon, details, `flow:${f.from}→${f.to}`, ctx.expanded);
	}
}
