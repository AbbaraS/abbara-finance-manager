import { byCategory } from '../../models/groupSpending';
import { sum } from '../../models/monthSummary';
import { countLabel } from '../../utils/countLabel';
import { formatMoney } from '../../utils/money';
import { formatPercent } from '../../utils/percent';
import type { DashboardContext } from '../DashboardContext';
import { categoryLook } from '../look/categoryLook';
import { iconDot } from '../look/iconDot';
import { expandable } from './expandable';
import { section } from './section';
import { shareBar } from './shareBar';
import { subTotals } from './subTotals';
import { tableHead } from './tableHead';
import { transactionRows } from './transactionRows';

// Spending per category; click a row to see its transactions and change their category.
export function categoryTable(el: HTMLElement, ctx: DashboardContext): void {
	// Data.
	const groups = byCategory(ctx.rows, ctx.month, ctx.settings);
	const body = section(el, 'Spending by category', 'shopping-cart');
	if (groups.length === 0) {
		body.createDiv({ cls: 'afm-muted', text: 'No spending this month.' });
		return;
	}

	// Table.
	const table = body.createEl('table', { cls: 'afm-table' });
	tableHead(table, [
		{ text: 'Category' },
		{ text: 'Share', cls: 'afm-bar-cell' },
		{ text: 'Amount', cls: 'afm-num' },
		{ text: '%', cls: 'afm-num' },
	]);

	// One category row, then its hidden transaction rows straight after it.
	const tbody = table.createEl('tbody');
	for (const g of groups) {
		const tr = tbody.createEl('tr');
		const name = tr.createEl('td');
		const look = categoryLook(g.key);
		const title = name.createDiv({ cls: 'afm-row-title' });
		const icon = title.createSpan({ cls: 'afm-chevron' });
		iconDot(title, look.icon, look.color);
		title.createSpan({ text: g.key });
		const subs = subTotals(g.rows, ctx.settings);
		name.createDiv({ cls: 'afm-muted afm-indent', text: countLabel(g.rows.length) + (subs ? ` · ${subs}` : '') });
		shareBar(tr.createEl('td', { cls: 'afm-bar-cell' }), g.share, look.color);
		tr.createEl('td', { cls: 'afm-num', text: formatMoney(g.total, ctx.settings) });
		tr.createEl('td', { cls: 'afm-num afm-muted', text: formatPercent(g.share) });

		expandable(tr, icon, transactionRows(tbody, g.rows, ctx), g.key, ctx.expanded);
	}

	// Total.
	const foot = table.createEl('tfoot').createEl('tr');
	foot.createEl('td', { text: 'Total' });
	foot.createEl('td', { cls: 'afm-bar-cell' });
	foot.createEl('td', { cls: 'afm-num', text: formatMoney(sum(groups.map((g) => g.total)), ctx.settings) });
	foot.createEl('td');
}
