import { findCounterparty } from '../../models/counterparties';
import { groupSpending } from '../../models/groupSpending';
import { sum } from '../../models/monthSummary';
import { countLabel } from '../../utils/countLabel';
import { formatMoney } from '../../utils/money';
import { formatPercent } from '../../utils/percent';
import type { DashboardContext } from '../DashboardContext';
import { categoryLook } from '../look/categoryLook';
import { iconDot } from '../look/iconDot';
import { expandable } from './expandable';
import { shareBar } from './shareBar';
import { tableHead } from './tableHead';
import { transactionRows } from './transactionRows';

// Spending this month for the counterparties picked in settings, biggest first; click one to see its transactions.
export function counterpartyTable(body: HTMLElement, ctx: DashboardContext): void {
	// Data.
	const picked = ctx.settings.shownCounterparties;
	if (picked.length === 0) {
		body.createDiv({ cls: 'afm-muted', text: 'Pick the counterparties to show in settings, under Dashboard sections.' });
		return;
	}
	const groups = groupSpending(ctx.rows, ctx.month, ctx.settings, (t) => t.counterparty).filter((g) => picked.includes(g.key));
	if (groups.length === 0) {
		body.createDiv({ cls: 'afm-muted', text: 'No spending with your picked counterparties this month.' });
		return;
	}

	// Table.
	const table = body.createEl('table', { cls: 'afm-table' });
	tableHead(table, [
		{ text: 'Counterparty' },
		{ text: 'Share', cls: 'afm-bar-cell' },
		{ text: 'Amount', cls: 'afm-num' },
		{ text: '%', cls: 'afm-num' },
	]);

	// One row per counterparty in its category's colour, then its hidden transactions.
	const tbody = table.createEl('tbody');
	for (const g of groups) {
		const category = findCounterparty(ctx.labels, g.key)?.category || g.rows[0].category;
		const look = categoryLook(category, ctx.labels);
		const tr = tbody.createEl('tr');
		const name = tr.createEl('td');
		const title = name.createDiv({ cls: 'afm-row-title' });
		const icon = title.createSpan({ cls: 'afm-chevron' });
		iconDot(title, look.icon, look.color);
		title.createSpan({ text: g.key });
		name.createDiv({ cls: 'afm-muted afm-indent', text: `${countLabel(g.rows.length)} · ${category}` });
		shareBar(tr.createEl('td', { cls: 'afm-bar-cell' }), g.share, look.color);
		tr.createEl('td', { cls: 'afm-num', text: formatMoney(g.total, ctx.settings) });
		tr.createEl('td', { cls: 'afm-num afm-muted', text: formatPercent(g.share) });
		expandable(tr, icon, transactionRows(tbody, g.rows, ctx), `counterparty:${g.key}`, ctx.expanded);
	}

	// Total, and the share of all spending it makes.
	const foot = table.createEl('tfoot').createEl('tr');
	foot.createEl('td', { text: 'Total' });
	foot.createEl('td', { cls: 'afm-bar-cell' });
	foot.createEl('td', { cls: 'afm-num', text: formatMoney(sum(groups.map((g) => g.total)), ctx.settings) });
	foot.createEl('td', { cls: 'afm-num afm-muted', text: formatPercent(sum(groups.map((g) => g.share))) });
}
