import { sum } from '../../models/monthSummary';
import { notGivenBack } from '../../models/linkRefunds';
import type { Transaction } from '../../models/Transaction';
import { countLabel } from '../../utils/countLabel';
import { formatChange, formatMoney } from '../../utils/money';
import type { DashboardContext } from '../DashboardContext';
import { personColor } from '../look/categoryLook';
import { iconDot } from '../look/iconDot';
import { masonry } from './masonry';
import { subRows } from './subRows';

// Money to and from people this month: one card per person in their colour, with what was sent and received. Inside:
// their subcategories, then "Debt" (transactions marked as a debt) and "Paid you back" (money linked to your purchases,
// taken off those purchases so not counted here). What you owe is in the Debts section.
export function peopleCards(body: HTMLElement, ctx: DashboardContext): void {
	// Data: rows per person, busiest first, rows without a person last.
	const s = ctx.settings;
	const rows = ctx.rows.filter((t) => t.month === ctx.month && t.currency === s.currency && (t.kind === 'people' || (t.refundOf && t.person)));
	const people = new Map<string, Transaction[]>();
	for (const t of rows) people.set(t.person, [...(people.get(t.person) ?? []), t]);
	const volume = (list: Transaction[]) => sum(list.map((t) => Math.abs(t.amount)));
	const keys = [...people.keys()].sort((a, b) => Number(!a) - Number(!b) || volume(people.get(b)!) - volume(people.get(a)!));
	if (keys.length === 0) return void body.createDiv({ cls: 'afm-muted', text: 'No money to or from people this month.' });

	// Cards.
	const grid = body.createDiv({ cls: 'afm-card-grid' });
	const show = (v: number) => formatChange(v, s);
	for (const key of keys) {
		const list = people.get(key)!;
		const card = grid.createDiv({ cls: 'afm-group-card' });
		const color = personColor(key, ctx.labels);
		card.setCssProps({ '--afm-cat': color });

		const top = card.createDiv({ cls: 'afm-group-top' });
		iconDot(top, 'user', color);
		const title = top.createDiv({ cls: 'afm-group-title' });
		title.createDiv({ cls: key ? 'afm-strong' : 'afm-strong afm-muted', text: key || 'No person' });
		title.createDiv({ cls: 'afm-muted', text: countLabel(list.length) });
		flows(top.createDiv({ cls: 'afm-group-total' }), list, ctx);

		const normal = list.filter((t) => !t.refundOf && !t.debt);
		const debt = list.filter((t) => !t.refundOf && t.debt);
		const back = list.filter((t) => t.refundOf);
		if (normal.length) subRows(card, normal, `person:${key}`, ctx, (t) => t.amount, show);
		if (debt.length) subRows(card, debt, `person:${key}`, ctx, (t) => t.amount, show, () => 'Debt');
		if (back.length) {
			const box = card.createDiv({ cls: 'afm-paid-back' });
			subRows(box, back, `person:${key}`, ctx, (t) => t.amount, show, () => 'Paid you back');
			box.createDiv({ cls: 'afm-paid-back-note', text: 'Taken off what you bought for them, so not counted as received.' });
		}
	}

	masonry(grid);

	// Total.
	const foot = body.createDiv({ cls: 'afm-grid-foot' });
	foot.createSpan({ text: 'Total' });
	flows(foot.createDiv({ cls: 'afm-strong' }), rows, ctx);
}

// "Sent £230.00" and "Received £30.00" lines, each only when there is some. Money linked to a purchase isn't received.
function flows(el: HTMLElement, rows: Transaction[], ctx: DashboardContext): void {
	const sent = sum(rows.filter((t) => t.amount < 0).map((t) => -t.amount));
	const received = sum(rows.filter((t) => t.amount > 0).map((t) => (t.refundOf ? notGivenBack(t) : t.amount)));
	if (sent) el.createDiv({ cls: 'afm-flow-out', text: `Sent ${formatMoney(sent, ctx.settings)}` });
	if (received) el.createDiv({ cls: 'afm-flow-in', text: `Received ${formatMoney(received, ctx.settings)}` });
}
