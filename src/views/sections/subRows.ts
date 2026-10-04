import { sum } from '../../models/monthSummary';
import { newestFirst, type Transaction } from '../../models/Transaction';
import type { DashboardContext } from '../DashboardContext';
import { expandable } from './expandable';
import { transactionItem } from './transactionItem';

// A card's subcategories, biggest first (no subcategory last), each with its total and a soft bar for its share.
// Click one to list its transactions (refunds sit under their purchase). `valueOf` is what a row adds to the total, `show` formats it.
export function subRows(parent: HTMLElement, rows: Transaction[], id: string, ctx: DashboardContext,
	valueOf: (t: Transaction) => number, show: (value: number) => string): void {
	const groups = new Map<string, Transaction[]>();
	for (const t of rows) groups.set(t.subcategory, [...(groups.get(t.subcategory) ?? []), t]);
	const totals = new Map([...groups].map(([key, list]) => [key, sum(list.map(valueOf))]));
	const all = sum([...totals.values()].map(Math.abs));
	const keys = [...groups.keys()].sort((a, b) => Number(!a) - Number(!b) || Math.abs(totals.get(b)!) - Math.abs(totals.get(a)!));

	const list = parent.createDiv({ cls: 'afm-sub-rows' });
	for (const key of keys) {
		const items = groups.get(key)!;
		const total = totals.get(key)!;
		// Refunds whose purchase is in the same list go under it, not on their own.
		const here = new Set(items.map((t) => t.id));
		const shown = items.filter((t) => !(t.refundOf && here.has(t.refundOf.id)));
		const row = list.createDiv({ cls: 'afm-sub-row' });
		row.setCssProps({ '--afm-share': `${all > 0 ? (Math.abs(total) / all) * 100 : 0}%` });
		const icon = row.createSpan({ cls: 'afm-chevron' });
		row.createSpan({ cls: key ? 'afm-sub-name' : 'afm-sub-name afm-muted', text: key || (groups.size === 1 ? 'Transactions' : 'No subcategory') });
		row.createSpan({ cls: 'afm-sub-count', text: String(shown.length) });
		row.createSpan({ cls: 'afm-sub-amount', text: show(total) });

		// Its transactions, newest first, hidden until opened.
		const box = list.createDiv({ cls: 'afm-items' });
		for (const t of newestFirst(shown)) {
			transactionItem(box, t, ctx, show(valueOf(t)), t.refunds.filter((r) => here.has(r.id)));
		}
		expandable(row, icon, [box], `${id}›${key}`, ctx.expanded);
	}
}
