import { sum } from '../../models/monthSummary';
import { newestFirst, type Transaction } from '../../models/Transaction';
import type { DashboardContext } from '../DashboardContext';
import { dayLabel } from '../../utils/dates';
import { expandable } from './expandable';
import { transactionItem } from './transactionItem';

// How many rows from one recipient fold into one line.
const FOLD_AT = 3;

// A card's subcategories, biggest first (no subcategory last), each with its total and a soft bar for its share.
// Click one to list its transactions (refunds sit under their purchase). `valueOf` is what a row adds to the total, `show` formats it.
// `keyOf` groups by something else than the subcategory (People: "Debt").
export function subRows(parent: HTMLElement, rows: Transaction[], id: string, ctx: DashboardContext,
	valueOf: (t: Transaction) => number, show: (value: number) => string, keyOf = (t: Transaction) => t.subcategory): void {
	const groups = new Map<string, Transaction[]>();
	for (const t of rows) groups.set(keyOf(t), [...(groups.get(keyOf(t)) ?? []), t]);
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

		// Its transactions, newest first, hidden until opened; 3+ from one recipient fold into one row.
		const box = list.createDiv({ cls: 'afm-items' });
		const merged = (t: Transaction) => t.refunds.filter((r) => here.has(r.t.id));
		const rows = newestFirst(shown);
		const nameOf = (t: Transaction) => (t.subscription ? '' : t.counterparty); // subscriptions show each payment
		const byName = new Map<string, Transaction[]>();
		for (const t of rows) if (nameOf(t)) byName.set(nameOf(t), [...(byName.get(nameOf(t)) ?? []), t]);
		const done = new Set<string>();
		for (const t of rows) {
			const same = byName.get(nameOf(t)) ?? [];
			if (same.length < FOLD_AT) transactionItem(box, t, ctx, show(valueOf(t)), merged(t));
			else if (!done.has(nameOf(t))) {
				done.add(nameOf(t));
				const total = sum(same.map(valueOf)) + sum(same.flatMap((x) => merged(x).map((r) => r.amount)));
				foldedRow(box, nameOf(t), same, show(total), `${id}›${key}›${nameOf(t)}`, ctx, (inner, x) => transactionItem(inner, x, ctx, show(valueOf(x)), merged(x)));
			}
		}
		expandable(row, icon, [box], `${id}›${key}`, ctx.expanded);
	}
}

// Several rows from one recipient as one line: "Uber 18 −£108.10" with the dates and accounts; open it for each row.
function foldedRow(box: HTMLElement, name: string, rows: Transaction[], amount: string, id: string, ctx: DashboardContext,
	item: (inner: HTMLElement, t: Transaction) => void): void {
	const s = ctx.settings;
	const row = box.createDiv({ cls: 'afm-item afm-item-fold' });
	const top = row.createDiv({ cls: 'afm-item-top' });
	const title = top.createDiv({ cls: 'afm-item-name' });
	const icon = title.createSpan({ cls: 'afm-chevron' });
	title.createSpan({ cls: 'afm-name', text: name });
	title.createSpan({ cls: 'afm-sub-count', text: String(rows.length) });
	top.createDiv({ cls: 'afm-item-amount', text: amount });
	const [last, first] = [rows[0].date, rows[rows.length - 1].date];
	const accounts = [...new Set(rows.map((t) => t.account))].join(', ');
	row.createDiv({ cls: 'afm-item-meta', text: `${dayLabel(first, s.locale)} – ${dayLabel(last, s.locale)} · ${accounts}` });
	const inner = box.createDiv({ cls: 'afm-items afm-fold-items' });
	for (const t of rows) item(inner, t);
	expandable(row, icon, [inner], id, ctx.expanded);
}
