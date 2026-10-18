import { findCounterparty } from '../../models/counterparties';
import { groupSpending } from '../../models/groupSpending';
import { sum } from '../../models/monthSummary';
import { rowKind, spendOf } from '../../models/rowKind';
import { newestFirst, type Transaction } from '../../models/Transaction';
import { formatChange, formatMoney } from '../../utils/money';
import type { DashboardContext } from '../DashboardContext';
import { categoryLook } from '../look/categoryLook';
import { iconDot } from '../look/iconDot';
import { expandable } from './expandable';
import { transactionItem } from './transactionItem';

// How many show before "Show all".
const TOP = 3;

// One entry in a top list: what it's called, its rows this month and what was spent.
interface Top { name: string; rows: Transaction[]; total: number; color: string; icon: string }

// This month's biggest spending by recipient and by tag, side by side: the top 3 of each, "Show all" for the rest.
// Click one for its transactions. A transaction with two tags counts under both.
export function topLists(body: HTMLElement, ctx: DashboardContext): void {
	// Data.
	const s = ctx.settings;
	const all = sum(ctx.rows.filter((t) => t.spendMonth === ctx.month).map((t) => spendOf(t, s)));
	const recipients: Top[] = groupSpending(ctx.rows, ctx.month, s, (t) => t.counterparty).filter((g) => g.key && g.total > 0).map((g) => {
		const look = categoryLook(findCounterparty(ctx.labels, g.key)?.category || g.rows[0].category, ctx.labels);
		return { name: g.key, rows: g.rows, total: g.total, color: look.color, icon: look.icon };
	});
	const spent = ctx.rows.filter((t) => t.spendMonth === ctx.month && ['spend', 'refund'].includes(rowKind(t, s)));
	const byTag = new Map<string, Transaction[]>();
	for (const t of spent) for (const tag of new Set([...t.tags, ...t.autoTags])) byTag.set(tag, [...(byTag.get(tag) ?? []), t]);
	const tags: Top[] = [...byTag].map(([name, rows]) => ({ name: `#${name}`, rows: newestFirst(rows), total: sum(rows.map((t) => spendOf(t, s))), color: 'var(--afm-c-magenta)', icon: 'hash' }))
		.filter((x) => x.total > 0).sort((a, b) => b.total - a.total);

	// Two columns.
	const grid = body.createDiv({ cls: 'afm-top-grid' });
	topList(grid, 'Recipients', recipients, all, 'top:recipients', 'No spending with a recipient this month.', ctx);
	topList(grid, 'Tags', tags, all, 'top:tags', 'No tagged spending this month. Add tags to a transaction, a recipient or a subscription.', ctx);
}

// One column: a heading, the top rows with a bar for their share of all spending, and "Show all 12" / "Show top 3".
function topList(grid: HTMLElement, title: string, list: Top[], all: number, id: string, empty: string, ctx: DashboardContext): void {
	const s = ctx.settings;
	const col = grid.createDiv({ cls: 'afm-top-col' });
	col.createDiv({ cls: 'afm-top-title', text: title });
	if (list.length === 0) return void col.createDiv({ cls: 'afm-muted', text: empty });
	const showAll = ctx.expanded.has(`${id}:all`);
	const rows = col.createDiv({ cls: 'afm-sub-rows' });
	for (const x of showAll ? list : list.slice(0, TOP)) {
		const row = rows.createDiv({ cls: 'afm-sub-row afm-top-row' });
		row.setCssProps({ '--afm-share': `${all > 0 ? (x.total / all) * 100 : 0}%`, '--afm-cat': x.color });
		const icon = row.createSpan({ cls: 'afm-chevron' });
		iconDot(row, x.icon, x.color, 'afm-top-dot');
		row.createSpan({ cls: 'afm-sub-name', text: x.name });
		row.createSpan({ cls: 'afm-sub-count', text: String(x.rows.length) });
		row.createSpan({ cls: 'afm-sub-amount', text: formatMoney(x.total, s) });
		const box = rows.createDiv({ cls: 'afm-items' });
		box.setCssProps({ '--afm-cat': x.color });
		for (const t of x.rows) transactionItem(box, t, ctx, formatChange(t.amount, s));
		expandable(row, icon, [box], `${id}:${x.name}`, ctx.expanded);
	}
	if (list.length <= TOP) return;
	const more = col.createEl('button', { cls: 'afm-link-button', text: showAll ? `Show top ${TOP}` : `Show all ${list.length}` });
	more.addEventListener('click', () => {
		if (showAll) ctx.expanded.delete(`${id}:all`);
		else ctx.expanded.add(`${id}:all`);
		ctx.redraw();
	});
}
