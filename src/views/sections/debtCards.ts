import { setTooltip } from 'obsidian';
import { debtGroups, owed, type Debt, type DebtGroup } from '../../models/debts';
import { sum } from '../../models/monthSummary';
import type { Transaction } from '../../models/Transaction';
import { countLabel } from '../../utils/countLabel';
import { dayLabel } from '../../utils/dates';
import { formatChange, formatMoney } from '../../utils/money';
import type { DashboardContext } from '../DashboardContext';
import { personColor } from '../look/categoryLook';
import { iconDot } from '../look/iconDot';
import { setIconSafe } from '../look/setIconSafe';
import { expandable } from './expandable';

// What you owe people (and they owe you), all time, apart from this month's money in People. One card per person in their
// colour, most owed first, with one row per debt (Car, Shein...) still open. Paid-off debts are hidden behind "Show 2 paid off",
// and people with everything paid off behind a link under the cards.
export function debtCards(body: HTMLElement, ctx: DashboardContext): void {
	// Data.
	const s = ctx.settings;
	const labels = ctx.labels;
	const people = [...new Set(labels.debts.map((d) => d.person))].map((person) => ({ person, groups: debtGroups(labels, person), balance: owed(labels, person) }));
	const open = people.filter((p) => p.groups.some((g) => g.left !== 0)).sort((a, b) => b.balance - a.balance);
	const settled = people.filter((p) => !open.includes(p)).sort((a, b) => a.person.localeCompare(b.person));
	const showSettled = ctx.expanded.has('debts:settled');
	const add = (el: HTMLElement) => el.createEl('button', { cls: 'afm-add-debt', text: '+ Add debt' }).addEventListener('click', () => ctx.editDebt(null));
	if (people.length === 0) {
		body.createDiv({ cls: 'afm-muted', text: 'No debts. Add one, or mark a transaction with a person as a debt in its edit window.' });
		return add(body);
	}

	// Cards.
	const grid = body.createDiv({ cls: 'afm-card-grid' });
	if (open.length === 0 && !showSettled) grid.createDiv({ cls: 'afm-muted', text: 'Everything is paid off.' });
	for (const p of [...open, ...(showSettled ? settled : [])]) debtCard(grid, p.person, p.groups, p.balance, ctx);

	// Totals, the paid-off people, and adding a debt for anyone.
	const foot = body.createDiv({ cls: 'afm-grid-foot' });
	const left = foot.createDiv();
	add(left);
	if (settled.length) {
		const toggle = left.createEl('button', { cls: 'afm-link-button', text: showSettled ? 'Hide people with nothing owed' : `Show ${countLabel(settled.length, 'person', 'people')} with nothing owed` });
		toggle.addEventListener('click', () => {
			if (showSettled) ctx.expanded.delete('debts:settled');
			else ctx.expanded.add('debts:settled');
			ctx.redraw();
		});
	}
	const totals = foot.createDiv({ cls: 'afm-strong' });
	const youOwe = sum(people.map((p) => Math.max(0, p.balance)));
	const theyOwe = sum(people.map((p) => Math.max(0, -p.balance)));
	if (youOwe) totals.createDiv({ cls: 'afm-debt-owed', text: `You owe ${formatMoney(youOwe, s)}` });
	if (theyOwe) totals.createDiv({ cls: 'afm-debt-owed is-theirs', text: `Owed to you ${formatMoney(theyOwe, s)}` });
	if (!youOwe && !theyOwe) totals.createDiv({ cls: 'afm-muted', text: 'All paid off' });
}

// One person's card: what's left overall and a + button, their open debts, then "Show 2 paid off" for the rest.
function debtCard(grid: HTMLElement, person: string, groups: DebtGroup[], balance: number, ctx: DashboardContext): void {
	const s = ctx.settings;
	const card = grid.createDiv({ cls: 'afm-group-card' });
	const color = personColor(person, ctx.labels);
	card.setCssProps({ '--afm-cat': color });
	const open = groups.filter((g) => g.left !== 0);
	const paid = groups.filter((g) => g.left === 0);

	const top = card.createDiv({ cls: 'afm-group-top' });
	iconDot(top, 'user', color);
	const title = top.createDiv({ cls: 'afm-group-title' });
	title.createDiv({ cls: 'afm-strong', text: person });
	title.createDiv({ cls: 'afm-muted', text: open.length ? countLabel(open.length, 'open debt') : 'Nothing owed' });
	const total = top.createDiv({ cls: 'afm-group-total' });
	if (balance) {
		total.createDiv({ cls: `afm-debt-label`, text: balance > 0 ? 'You owe' : 'Owes you' });
		total.createDiv({ cls: `afm-debt-owed${balance < 0 ? ' is-theirs' : ''}`, text: formatMoney(Math.abs(balance), s) });
	}
	const plus = top.createEl('button', { cls: 'clickable-icon afm-debt-add' });
	setIconSafe(plus, 'plus');
	setTooltip(plus, `Add a debt with ${person}`);
	plus.addEventListener('click', () => ctx.editDebt(null, person));

	// Open debts, then the paid-off ones when shown.
	const byId = new Map(ctx.rows.map((t) => [t.id, t]));
	const list = card.createDiv({ cls: 'afm-sub-rows' });
	for (const g of open) debtRow(list, person, g, byId, ctx);
	if (!paid.length) return;
	const key = `debt-paid:${person}`;
	const shown = ctx.expanded.has(key);
	if (shown) for (const g of paid) debtRow(list, person, g, byId, ctx);
	const toggle = card.createEl('button', { cls: 'afm-link-button', text: shown ? 'Hide paid off' : `Show ${paid.length} paid off` });
	toggle.addEventListener('click', () => {
		if (shown) ctx.expanded.delete(key);
		else ctx.expanded.add(key);
		ctx.redraw();
	});
}

// One debt: its reason, entry count and what's left; open it for borrowed / paid back totals and entries, newest first.
function debtRow(list: HTMLElement, person: string, g: DebtGroup, byId: Map<string, Transaction>, ctx: DashboardContext): void {
	const s = ctx.settings;
	const row = list.createDiv({ cls: `afm-sub-row afm-debt-row${g.left === 0 ? ' is-settled' : ''}` });
	const icon = row.createSpan({ cls: 'afm-chevron' });
	row.createSpan({ cls: `afm-sub-name${g.reason ? '' : ' afm-muted'}`, text: g.reason || 'No reason' });
	row.createSpan({ cls: 'afm-sub-count', text: String(g.entries.length) });
	row.createSpan({
		cls: `afm-sub-amount${g.left > 0 ? ' afm-debt-owed' : g.left < 0 ? ' afm-debt-owed is-theirs' : ' afm-muted'}`,
		text: g.left > 0 ? `${formatMoney(g.left, s)} left` : g.left < 0 ? `${formatMoney(-g.left, s)} to you` : 'Paid off',
	});
	const box = list.createDiv({ cls: 'afm-items' });
	const sums = [g.borrowed ? `Borrowed ${formatMoney(g.borrowed, s)}` : '', g.paid ? `paid back ${formatMoney(g.paid, s)}` : ''].filter(Boolean).join(' · ');
	box.createDiv({ cls: 'afm-debt-sums', text: sums.charAt(0).toUpperCase() + sums.slice(1) });
	for (const d of g.entries) debtItem(box, d, d.transaction ? byId.get(d.transaction) : undefined, ctx);
	expandable(row, icon, [box], `debt:${person}›${g.reason}`, ctx.expanded);
}

// One debt entry: its note (else the transaction's, else "From Mum" / "To Mum"), date, account, and + / − to what you owe.
// Entries added by hand open the debt window; marked transactions open their edit window.
function debtItem(parent: HTMLElement, d: Debt, t: Transaction | undefined, ctx: DashboardContext): void {
	const s = ctx.settings;
	const item = parent.createDiv({ cls: 'afm-item', attr: { tabindex: '0', role: 'button' } });
	const top = item.createDiv({ cls: 'afm-item-top' });
	top.createDiv({ cls: 'afm-name', text: d.note || t?.note || `${d.amount > 0 ? 'From' : 'To'} ${d.person}` });
	top.createDiv({ cls: `afm-item-amount ${d.amount > 0 ? 'afm-flow-out' : 'afm-flow-in'}`, text: formatChange(d.amount, s) });
	const meta = item.createDiv({ cls: 'afm-item-meta' });
	const part = t && Math.abs(d.amount) < Math.abs(t.amount) - 0.005 ? ` (of ${formatMoney(Math.abs(t.amount), s)})` : '';
	meta.createSpan({ text: [`${dayLabel(d.date, s.locale)} ${d.date.slice(0, 4)}`, t?.account ?? '', (d.amount > 0 ? 'borrowed' : 'paid back') + part].filter(Boolean).join(' · ') });
	if (!d.transaction) meta.createSpan({ cls: 'afm-tag afm-tag-auto', text: 'by hand' });

	const open = () => (t ? ctx.editCategory([t], false) : ctx.editDebt(d));
	item.addEventListener('click', open);
	item.addEventListener('keydown', (e) => { if (e.key === 'Enter') open(); });
}
