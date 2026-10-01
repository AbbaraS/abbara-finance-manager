import { sum } from '../../models/monthSummary';
import { rowKind, spendOf } from '../../models/rowKind';
import type { Transaction } from '../../models/Transaction';
import { countLabel } from '../../utils/countLabel';
import { formatMoney } from '../../utils/money';
import { formatPercent } from '../../utils/percent';
import type { DashboardContext } from '../DashboardContext';
import { expandable } from './expandable';
import { shareBar } from './shareBar';
import { tableHead } from './tableHead';
import { transactionRows } from './transactionRows';

// Spending this month per tag (its own tags and ones from its counterparty or subscription), biggest first.
// A transaction with two tags counts under both, so the tags don't add up to your spending. Click one for its transactions.
export function tagTable(body: HTMLElement, ctx: DashboardContext): void {
	// Data.
	const s = ctx.settings;
	const spent = ctx.rows.filter((t) => t.month === ctx.month && ['spend', 'refund'].includes(rowKind(t, s)));
	const all = sum(spent.map((t) => spendOf(t, s)));
	const tags = new Map<string, Transaction[]>();
	for (const t of spent) for (const tag of new Set([...t.tags, ...t.autoTags])) tags.set(tag, [...(tags.get(tag) ?? []), t]);
	if (tags.size === 0) {
		body.createDiv({ cls: 'afm-muted', text: 'No tagged spending this month. Add tags to a transaction, a counterparty or a subscription.' });
		return;
	}
	const groups = [...tags].map(([tag, rows]) => ({ tag, rows, total: sum(rows.map((t) => spendOf(t, s))) })).sort((a, b) => b.total - a.total);

	// Table.
	const table = body.createEl('table', { cls: 'afm-table' });
	tableHead(table, [
		{ text: 'Tag' },
		{ text: 'Share of spending', cls: 'afm-bar-cell' },
		{ text: 'Amount', cls: 'afm-num' },
		{ text: '%', cls: 'afm-num' },
	]);
	const tbody = table.createEl('tbody');
	for (const g of groups) {
		const share = all > 0 ? g.total / all : 0;
		const tr = tbody.createEl('tr');
		const name = tr.createEl('td');
		const title = name.createDiv({ cls: 'afm-row-title' });
		const icon = title.createSpan({ cls: 'afm-chevron' });
		title.createSpan({ cls: 'afm-tag', text: `#${g.tag}` });
		name.createDiv({ cls: 'afm-muted afm-indent-chevron', text: countLabel(g.rows.length) });
		shareBar(tr.createEl('td', { cls: 'afm-bar-cell' }), share);
		tr.createEl('td', { cls: 'afm-num', text: formatMoney(g.total, s) });
		tr.createEl('td', { cls: 'afm-num afm-muted', text: formatPercent(share) });
		const rows = [...g.rows].sort((a, b) => a.amount - b.amount);
		expandable(tr, icon, transactionRows(tbody, rows, ctx, 0), `tag:${g.tag}`, ctx.expanded);
	}
}
