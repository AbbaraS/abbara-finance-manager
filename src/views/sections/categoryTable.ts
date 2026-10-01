import { findCategory } from '../../models/categories';
import { byCategory } from '../../models/groupSpending';
import { sum } from '../../models/monthSummary';
import { spendOf } from '../../models/rowKind';
import type { Transaction } from '../../models/Transaction';
import { countLabel } from '../../utils/countLabel';
import { formatMoney } from '../../utils/money';
import { formatPercent } from '../../utils/percent';
import type { DashboardContext } from '../DashboardContext';
import { categoryLook } from '../look/categoryLook';
import { iconDot } from '../look/iconDot';
import { expandable } from './expandable';
import { section } from './section';
import { shareBar } from './shareBar';
import { tableHead } from './tableHead';
import { transactionRows } from './transactionRows';

// How rows split inside a category, and the name for rows without one.
interface Split {
	of: (t: Transaction) => string;
	none: string;
}
const BY_PERSON: Split = { of: (t) => t.person, none: 'No person' };
const BY_SUB: Split = { of: (t) => t.subcategory, none: 'No subcategory' };

// Spending per category; click a row to open its subcategories (people, then their subcategories, under People),
// each with its total, and click those to see their transactions.
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

	// One category row, then its hidden subcategory and transaction rows straight after it.
	const tbody = table.createEl('tbody');
	for (const g of groups) {
		const tr = tbody.createEl('tr');
		const name = tr.createEl('td');
		const look = categoryLook(g.key, ctx.labels);
		const title = name.createDiv({ cls: 'afm-row-title' });
		const icon = title.createSpan({ cls: 'afm-chevron' });
		iconDot(title, look.icon, look.color);
		title.createSpan({ text: g.key });
		name.createDiv({ cls: 'afm-muted afm-indent', text: countLabel(g.rows.length) });
		shareBar(tr.createEl('td', { cls: 'afm-bar-cell' }), g.share, look.color);
		tr.createEl('td', { cls: 'afm-num', text: formatMoney(g.total, ctx.settings) });
		tr.createEl('td', { cls: 'afm-num afm-muted', text: formatPercent(g.share) });

		const splits = findCategory(ctx.labels, g.key)?.kind === 'people' ? [BY_PERSON, BY_SUB] : [BY_SUB];
		const inside = splitRows(tbody, g.rows, splits, g.key, () => ctx.expanded.has(g.key), 1, g.total, look.color, ctx);
		expandable(tr, icon, inside.rows, g.key, ctx.expanded, undefined, inside.refresh);
	}

	// Total.
	const foot = table.createEl('tfoot').createEl('tr');
	foot.createEl('td', { text: 'Total' });
	foot.createEl('td', { cls: 'afm-bar-cell' });
	foot.createEl('td', { cls: 'afm-num', text: formatMoney(sum(groups.map((g) => g.total)), ctx.settings) });
	foot.createEl('td');
}

// Rows under a category or group: one collapsible row per subcategory (or person) with its total, its own rows under it.
// When nothing splits them, the transactions. Returns the rows at this level and a function that redraws what's open.
function splitRows(tbody: HTMLElement, rows: Transaction[], splits: Split[], id: string, shown: () => boolean,
	depth: number, total: number, color: string, ctx: DashboardContext): { rows: HTMLElement[]; refresh: () => void } {
	const [split, ...rest] = splits;
	if (!split) return { rows: transactionRows(tbody, rows, ctx, depth), refresh: () => {} };

	// Groups, biggest first, rows without one last. One group without a name isn't worth a row.
	const groups = new Map<string, Transaction[]>();
	for (const t of rows) groups.set(split.of(t), [...(groups.get(split.of(t)) ?? []), t]);
	if (groups.size === 1 && groups.has('')) return splitRows(tbody, rows, rest, id, shown, depth, total, color, ctx);
	const totals = new Map([...groups].map(([key, list]) => [key, sum(list.map((t) => spendOf(t, ctx.settings)))]));
	const keys = [...groups.keys()].sort((a, b) => Number(!a) - Number(!b) || totals.get(b)! - totals.get(a)!);

	const level: HTMLElement[] = [];
	const refreshers: (() => void)[] = [];
	for (const key of keys) {
		const gid = `${id}›${key}`;
		const amount = totals.get(key)!;
		const share = total > 0 ? amount / total : 0;
		const tr = tbody.createEl('tr', { cls: 'afm-group' });
		tr.setCssProps({ '--afm-depth': String(depth) });
		const title = tr.createEl('td').createDiv({ cls: 'afm-row-title' });
		const icon = title.createSpan({ cls: 'afm-chevron' });
		title.createSpan({ cls: key ? '' : 'afm-muted', text: key || split.none });
		title.createSpan({ cls: 'afm-muted', text: countLabel(groups.get(key)!.length) });
		shareBar(tr.createEl('td', { cls: 'afm-bar-cell' }), share, color);
		tr.createEl('td', { cls: 'afm-num', text: formatMoney(amount, ctx.settings) });
		tr.createEl('td', { cls: 'afm-num afm-muted', text: formatPercent(share) });

		const open = () => shown() && ctx.expanded.has(gid);
		const inside = splitRows(tbody, groups.get(key)!, rest, gid, open, depth + 1, amount, color, ctx);
		refreshers.push(expandable(tr, icon, inside.rows, gid, ctx.expanded, shown, inside.refresh), inside.refresh);
		level.push(tr);
	}
	return { rows: level, refresh: () => refreshers.forEach((f) => f()) };
}
