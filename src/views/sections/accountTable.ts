import { byAccount } from '../../models/groupSpending';
import { countLabel } from '../../utils/countLabel';
import { formatMoney } from '../../utils/money';
import { formatPercent } from '../../utils/percent';
import type { DashboardContext } from '../DashboardContext';
import { accountLook } from '../look/accountLook';
import { iconDot } from '../look/iconDot';
import { section } from './section';
import { shareBar } from './shareBar';
import { tableHead } from './tableHead';

// Spending per account: name, share bar, amount and percent.
export function accountTable(el: HTMLElement, ctx: DashboardContext): void {
	// 1. Data.
	const groups = byAccount(ctx.rows, ctx.month, ctx.settings);
	const body = section(el, 'Spending by account', 'landmark');
	if (groups.length === 0) {
		body.createDiv({ cls: 'afm-muted', text: 'No spending this month.' });
		return;
	}
	
	// 2. Table and header row.
	const table = body.createEl('table', { cls: 'afm-table' });
	tableHead(table, [
		{ text: 'Account' },
		{ text: 'Share', cls: 'afm-bar-cell' },
		{ text: 'Amount', cls: 'afm-num' },
		{ text: '%', cls: 'afm-num' },
	]);

	// 3. One row per account.
	const tbody = table.createEl('tbody');
	for (const g of groups) {
		const tr = tbody.createEl('tr');
		const name = tr.createEl('td');
		const title = name.createDiv({ cls: 'afm-row-title' });
		const look = accountLook(g.key);
		iconDot(title, look.icon, look.color);
		title.createSpan({ text: g.key });
		name.createDiv({ cls: 'afm-muted afm-indent-dot', text: countLabel(g.rows.length) });
		shareBar(tr.createEl('td', { cls: 'afm-bar-cell' }), g.share, look.color);
		tr.createEl('td', { cls: 'afm-num', text: formatMoney(g.total, ctx.settings) });
		tr.createEl('td', { cls: 'afm-num afm-muted', text: formatPercent(g.share) });
	}
}
