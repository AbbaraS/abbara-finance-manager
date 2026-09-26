import { byAccount } from '../../models/groupSpending';
import { formatMoney } from '../../utils/money';
import { formatPercent } from '../../utils/percent';
import type { DashboardContext } from '../DashboardContext';
import { section } from './section';
import { shareBar } from './shareBar';

// Spending per account: name, share bar, amount and percent.
export function accountTable(el: HTMLElement, ctx: DashboardContext): void {
	// 1. Data.
	const groups = byAccount(ctx.rows, ctx.month, ctx.settings);
	const body = section(el, 'Spending by account');
	if (groups.length === 0) {
		body.createDiv({ cls: 'afm-muted', text: 'No spending this month.' });
		return;
	}

	// 2. Table and header row.
	const table = body.createEl('table', { cls: 'afm-table' });
	const head = table.createEl('thead').createEl('tr');
	head.createEl('th', { text: 'Account' });
	head.createEl('th', { cls: 'afm-bar-cell', text: 'Share' });
	head.createEl('th', { cls: 'afm-num', text: 'Amount' });
	head.createEl('th', { cls: 'afm-num', text: '%' });

	// 3. One row per account.
	const tbody = table.createEl('tbody');
	for (const g of groups) {
		const tr = tbody.createEl('tr');
		const name = tr.createEl('td');
		name.createDiv({ text: g.key });
		name.createDiv({ cls: 'afm-muted', text: `${g.rows.length} transactions` });
		shareBar(tr.createEl('td', { cls: 'afm-bar-cell' }), g.share);
		tr.createEl('td', { cls: 'afm-num', text: formatMoney(g.total, ctx.settings) });
		tr.createEl('td', { cls: 'afm-num afm-muted', text: formatPercent(g.share) });
	}
}
