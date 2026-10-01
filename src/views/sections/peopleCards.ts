import { sum } from '../../models/monthSummary';
import type { Transaction } from '../../models/Transaction';
import { countLabel } from '../../utils/countLabel';
import { formatChange, formatMoney } from '../../utils/money';
import type { DashboardContext } from '../DashboardContext';
import { categoryLook } from '../look/categoryLook';
import { iconDot } from '../look/iconDot';
import { subRows } from './subRows';

// Money to and from people this month: one card per person with what was sent and received, and their subcategories.
// Money sent counts in Spending; money received isn't income.
export function peopleCards(body: HTMLElement, ctx: DashboardContext): void {
	// Data: rows per person, busiest first, rows without a person last.
	const s = ctx.settings;
	const rows = ctx.rows.filter((t) => t.month === ctx.month && t.kind === 'people' && t.currency === s.currency);
	if (rows.length === 0) {
		body.createDiv({ cls: 'afm-muted', text: 'No money to or from people this month.' });
		return;
	}
	const people = new Map<string, Transaction[]>();
	for (const t of rows) people.set(t.person, [...(people.get(t.person) ?? []), t]);
	const volume = (list: Transaction[]) => sum(list.map((t) => Math.abs(t.amount)));
	const keys = [...people.keys()].sort((a, b) => Number(!a) - Number(!b) || volume(people.get(b)!) - volume(people.get(a)!));
	const several = new Set(rows.map((t) => t.category)).size > 1; // name the People category only when there's a choice

	// Cards.
	const grid = body.createDiv({ cls: 'afm-card-grid' });
	for (const key of keys) {
		const list = people.get(key)!;
		const look = categoryLook(list[0].category, ctx.labels);
		const card = grid.createDiv({ cls: 'afm-group-card' });
		card.setCssProps({ '--afm-cat': look.color });

		const top = card.createDiv({ cls: 'afm-group-top' });
		iconDot(top, 'user', look.color);
		const title = top.createDiv({ cls: 'afm-group-title' });
		title.createDiv({ cls: key ? 'afm-strong' : 'afm-strong afm-muted', text: key || 'No person' });
		title.createDiv({ cls: 'afm-muted', text: [countLabel(list.length), several ? list[0].category : ''].filter(Boolean).join(' · ') });
		flows(top.createDiv({ cls: 'afm-group-total' }), list, ctx);

		subRows(card, list, `person:${key}`, ctx, (t) => t.amount, (v) => formatChange(v, s));
	}

	// Totals.
	const foot = body.createDiv({ cls: 'afm-grid-foot' });
	foot.createSpan({ text: 'Total' });
	flows(foot.createDiv({ cls: 'afm-strong' }), rows, ctx);
}

// "Sent £230.00" and "Received £30.00" lines, each only when there is some.
function flows(el: HTMLElement, rows: Transaction[], ctx: DashboardContext): void {
	const sent = sum(rows.filter((t) => t.amount < 0).map((t) => -t.amount));
	const received = sum(rows.filter((t) => t.amount > 0).map((t) => t.amount));
	if (sent) el.createDiv({ cls: 'afm-flow-out', text: `Sent ${formatMoney(sent, ctx.settings)}` });
	if (received) el.createDiv({ cls: 'afm-flow-in', text: `Received ${formatMoney(received, ctx.settings)}` });
}
