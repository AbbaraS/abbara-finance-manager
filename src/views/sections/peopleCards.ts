import { setTooltip } from 'obsidian';
import { debtGroups, owed, type Debt } from '../../models/debts';
import { sum } from '../../models/monthSummary';
import type { Transaction } from '../../models/Transaction';
import { countLabel } from '../../utils/countLabel';
import { dayLabel } from '../../utils/dates';
import { formatChange, formatMoney } from '../../utils/money';
import type { DashboardContext } from '../DashboardContext';
import { categoryLook } from '../look/categoryLook';
import { iconDot } from '../look/iconDot';
import { setIconSafe } from '../look/setIconSafe';
import { expandable } from './expandable';
import { subRows } from './subRows';

// Money to and from people this month: one card per person with what was sent and received, and their subcategories.
// Money sent counts in Spending; money received isn't income. Each card also shows what you owe them (all time).
export function peopleCards(body: HTMLElement, ctx: DashboardContext): void {
	// Data: rows per person, busiest first, rows without a person last; then people you only have debts with.
	const s = ctx.settings;
	const labels = ctx.labels;
	const rows = ctx.rows.filter((t) => t.month === ctx.month && t.kind === 'people' && t.currency === s.currency);
	const people = new Map<string, Transaction[]>();
	for (const t of rows) people.set(t.person, [...(people.get(t.person) ?? []), t]);
	const volume = (list: Transaction[]) => sum(list.map((t) => Math.abs(t.amount)));
	const keys = [...people.keys()].sort((a, b) => Number(!a) - Number(!b) || volume(people.get(b)!) - volume(people.get(a)!));
	const inDebt = [...new Set(labels.debts.map((d) => d.person))].filter((p) => !people.has(p) && owed(labels, p) !== 0).sort((a, b) => a.localeCompare(b));
	const several = new Set(rows.map((t) => t.category)).size > 1; // name the People category only when there's a choice

	// Cards.
	const add = () => body.createEl('button', { cls: 'afm-add-debt', text: '+ Add debt' }).addEventListener('click', () => ctx.editDebt(null));
	if (keys.length + inDebt.length === 0) {
		body.createDiv({ cls: 'afm-muted', text: 'No money to or from people this month.' });
		return add();
	}
	const grid = body.createDiv({ cls: 'afm-card-grid' });
	for (const key of [...keys, ...inDebt]) {
		const list = people.get(key) ?? [];
		const category = list[0]?.category ?? labels.people.find((p) => p.name === key)?.category ?? '';
		const look = categoryLook(category, labels);
		const card = grid.createDiv({ cls: 'afm-group-card' });
		card.setCssProps({ '--afm-cat': look.color });

		const top = card.createDiv({ cls: 'afm-group-top' });
		iconDot(top, 'user', look.color);
		const title = top.createDiv({ cls: 'afm-group-title' });
		title.createDiv({ cls: key ? 'afm-strong' : 'afm-strong afm-muted', text: key || 'No person' });
		title.createDiv({ cls: 'afm-muted', text: list.length ? [countLabel(list.length), several ? category : ''].filter(Boolean).join(' · ') : 'Nothing this month' });
		flows(top.createDiv({ cls: 'afm-group-total' }), list, ctx);

		if (key) debtBlock(card, key, ctx);
		if (list.length) subRows(card, list, `person:${key}`, ctx, (t) => t.amount, (v) => formatChange(v, s));
	}

	// Totals, and adding a debt for anyone.
	const foot = body.createDiv({ cls: 'afm-grid-foot' });
	foot.createSpan({ text: 'Total' });
	const totals = foot.createDiv({ cls: 'afm-strong' });
	flows(totals, rows, ctx);
	const allOwed = sum([...new Set(labels.debts.map((d) => d.person))].map((p) => Math.max(0, owed(labels, p))));
	if (allOwed) totals.createDiv({ cls: 'afm-debt-owed', text: `You owe ${formatMoney(allOwed, s)}` });
	add();
}

// "Sent £230.00" and "Received £30.00" lines, each only when there is some.
function flows(el: HTMLElement, rows: Transaction[], ctx: DashboardContext): void {
	const sent = sum(rows.filter((t) => t.amount < 0).map((t) => -t.amount));
	const received = sum(rows.filter((t) => t.amount > 0).map((t) => t.amount));
	if (sent) el.createDiv({ cls: 'afm-flow-out', text: `Sent ${formatMoney(sent, ctx.settings)}` });
	if (received) el.createDiv({ cls: 'afm-flow-in', text: `Received ${formatMoney(received, ctx.settings)}` });
}

// What you owe a person, all time: a row with the total and a + button, then one row per debt (Car, Shein...) with
// what's left; open one for its borrowed / paid back totals and entries, newest first. Nothing when they have no entries.
// Entries added by hand open the debt window; marked transactions open their edit window.
function debtBlock(card: HTMLElement, person: string, ctx: DashboardContext): void {
	const s = ctx.settings;
	const groups = debtGroups(ctx.labels, person);
	if (!groups.length) return; // add one with "+ Add debt" under the cards
	const balance = owed(ctx.labels, person);
	const head = card.createDiv({ cls: 'afm-sub-row afm-debt-row afm-debt-head' });
	head.createSpan({ cls: 'afm-sub-name', text: balance > 0 ? 'You owe' : balance < 0 ? 'They owe you' : 'Debts paid off' });
	if (balance) head.createSpan({ cls: `afm-sub-amount afm-debt-owed${balance < 0 ? ' is-theirs' : ''}`, text: formatMoney(Math.abs(balance), s) });
	const add = head.createEl('button', { cls: 'clickable-icon afm-debt-add' });
	setIconSafe(add, 'plus');
	setTooltip(add, `Add a debt with ${person}`);
	add.addEventListener('click', () => ctx.editDebt(null, person));

	// One row per debt, its entries hidden until opened.
	const byId = new Map(ctx.rows.map((t) => [t.id, t]));
	for (const g of groups) {
		const row = card.createDiv({ cls: `afm-sub-row afm-debt-row${g.left === 0 ? ' is-settled' : ''}` });
		const icon = row.createSpan({ cls: 'afm-chevron' });
		row.createSpan({ cls: `afm-sub-name${g.reason ? '' : ' afm-muted'}`, text: g.reason || 'No reason' });
		row.createSpan({ cls: 'afm-sub-count', text: String(g.entries.length) });
		row.createSpan({
			cls: `afm-sub-amount${g.left > 0 ? ' afm-debt-owed' : g.left < 0 ? ' afm-debt-owed is-theirs' : ' afm-muted'}`,
			text: g.left > 0 ? `${formatMoney(g.left, s)} left` : g.left < 0 ? `${formatMoney(-g.left, s)} to you` : 'Paid off',
		});
		const box = card.createDiv({ cls: 'afm-items' });
		const sums = [g.borrowed ? `Borrowed ${formatMoney(g.borrowed, s)}` : '', g.paid ? `paid back ${formatMoney(g.paid, s)}` : ''].filter(Boolean).join(' · ');
		box.createDiv({ cls: 'afm-debt-sums', text: sums.charAt(0).toUpperCase() + sums.slice(1) });
		for (const d of g.entries) debtItem(box, d, d.transaction ? byId.get(d.transaction) : undefined, ctx);
		expandable(row, icon, [box], `debt:${person}›${g.reason}`, ctx.expanded);
	}
}

// One debt entry: its note (else the transaction's, else "From Mum" / "To Mum"), date, account, and + / − to what you owe.
function debtItem(parent: HTMLElement, d: Debt, t: Transaction | undefined, ctx: DashboardContext): void {
	const s = ctx.settings;
	const item = parent.createDiv({ cls: 'afm-item', attr: { tabindex: '0', role: 'button' } });
	const top = item.createDiv({ cls: 'afm-item-top' });
	const name = d.note || t?.note || `${d.amount > 0 ? 'From' : 'To'} ${d.person}`;
	top.createDiv({ cls: 'afm-name', text: name });
	top.createDiv({ cls: `afm-item-amount ${d.amount > 0 ? 'afm-flow-out' : 'afm-flow-in'}`, text: formatChange(d.amount, s) });
	const meta = item.createDiv({ cls: 'afm-item-meta' });
	const part = t && Math.abs(d.amount) < Math.abs(t.amount) - 0.005 ? ` (of ${formatMoney(Math.abs(t.amount), s)})` : '';
	meta.createSpan({ text: [dayLabel(d.date, s.locale), t?.account ?? '', (d.amount > 0 ? 'borrowed' : 'paid back') + part].filter(Boolean).join(' · ') });
	if (!d.transaction) meta.createSpan({ cls: 'afm-tag afm-tag-auto', text: 'by hand' });

	const open = () => (t ? ctx.editCategory([t], false) : ctx.editDebt(d));
	item.addEventListener('click', open);
	item.addEventListener('keydown', (e) => { if (e.key === 'Enter') open(); });
}
