import { setTooltip } from 'obsidian';
import { sum } from '../../models/monthSummary';
import { STATUS_LABELS, type Period, type Subscription, type SubscriptionStatus } from '../../models/Subscription';
import { looseSubscriptions, monthlyCost, subscriptionSummaries, type LooseSubscription, type SubscriptionSummary } from '../../models/subscriptions';
import type { Transaction } from '../../models/Transaction';
import { dayLabel, monthLabel } from '../../utils/dates';
import { formatMoney } from '../../utils/money';
import type { DashboardContext } from '../DashboardContext';
import { expandable } from './expandable';
import { tableHead } from './tableHead';
import { rowName } from './rowName';

// "£2.99 a month".
const PER: Record<Period, string> = { week: 'a week', month: 'a month', quarter: 'every 3 months', year: 'a year' };

// Order: running, then cancelled (by the shown month).
const rank = (x: SubscriptionSummary) => (x.ended ? 1 : 0);

// Your subscriptions and instalments: price, payments so far, this month and in total; click one for its payments.
// Then anything categorised as a subscription that isn't one yet, with a button to set it up.
// Up to the shown month (as they were then) or Overall (every payment), remembered in settings.
export function subscriptionTable(body: HTMLElement, ctx: DashboardContext): void {
	const s = ctx.settings;
	const tabs = body.createDiv({ cls: 'afm-years afm-sub-view', attr: { role: 'tablist', 'aria-label': 'Subscriptions shown' } });
	for (const [text, overall] of [[`Up to ${monthLabel(ctx.month, s.locale)}`, false], ['Overall', true]] as const) {
		const tab = tabs.createEl('button', { cls: 'afm-tab', text, attr: { role: 'tab', 'aria-selected': String(overall === s.subscriptionsOverall) } });
		tab.toggleClass('is-active', overall === s.subscriptionsOverall);
		tab.addEventListener('click', () => {
			if (overall === s.subscriptionsOverall) return;
			s.subscriptionsOverall = overall;
			ctx.saveSettings();
		});
	}

	const list = subscriptionSummaries(ctx.rows, ctx.labels, ctx.month, s, !s.subscriptionsOverall).sort((a, b) => rank(a) - rank(b));
	const loose = looseSubscriptions(ctx.rows, ctx.month, s, !s.subscriptionsOverall);
	if (list.length > 0 || loose.length > 0) subscriptionList(body, list, loose, ctx);
	else body.createDiv({ cls: 'afm-muted', text: s.subscriptionsOverall ? 'None yet. Name one from a payment\'s edit window.' : 'No subscription payments up to this month.' });
}

// The table: named subscriptions, then ones not set up yet.
function subscriptionList(body: HTMLElement, list: SubscriptionSummary[], loose: LooseSubscription[], ctx: DashboardContext): void {
	const s = ctx.settings;
	const table = body.createEl('table', { cls: 'afm-table' });
	tableHead(table, [
		{ text: 'Subscription' },
		{ text: 'Paid', cls: 'afm-num' },
		{ text: 'This month', cls: 'afm-num afm-narrow-hide' },
		{ text: 'Total', cls: 'afm-num' },
	]);

	const tbody = table.createEl('tbody');
	for (const x of list) {
		const tr = tbody.createEl('tr');
		tr.toggleClass('afm-not-income', x.ended); // faded
		const cell = tr.createEl('td');
		const title = cell.createDiv({ cls: 'afm-row-title' });
		const icon = title.createSpan({ cls: 'afm-chevron' });
		title.createSpan({ cls: 'afm-strong', text: x.sub.name });
		if (x.sub.status === 'cancelled' && !x.ended) title.createSpan({ cls: 'afm-muted', text: 'cancelled later' }); // still running in the shown month
		else statusSelect(title, x, ctx);
		const when = [x.last && `last ${dayLabel(x.last, s.locale)}`, x.next && `next ${dayLabel(x.next, s.locale)}`].filter(Boolean);
		cell.createDiv({ cls: 'afm-muted afm-indent-chevron', text: [x.sub.type, `${formatMoney(x.price, s)} ${PER[x.sub.period]}`, ...when].filter(Boolean).join(' · ') });

		const paid = tr.createEl('td', { cls: 'afm-num', text: x.sub.payments ? `${x.paid}/${x.sub.payments}` : String(x.paid) });
		setTooltip(paid, x.sub.paidBefore ? `Includes ${x.sub.paidBefore} paid before your statements` : 'Payments so far');
		tr.createEl('td', { cls: 'afm-num afm-narrow-hide', text: x.month ? formatMoney(x.month, s) : '–' });
		const total = tr.createEl('td', { cls: 'afm-num' });
		total.createDiv({ text: formatMoney(x.total, s) });
		if (x.sub.payments) total.createDiv({ cls: 'afm-muted', text: `of ${formatMoney(x.price * x.sub.payments, s)}` });

		expandable(tr, icon, paymentRows(tbody, x.rows, ctx, x.sub), `sub:${x.sub.name}`, ctx.expanded);
	}

	// Categorised as a subscription, but no subscription claims them.
	if (loose.length) {
		const head = tbody.createEl('tr', { cls: 'afm-loose-head' });
		head.createEl('td', { text: 'Not set up yet: in a Subscriptions category, but no subscription matches them', attr: { colspan: 4 } });
	}
	for (const x of loose) {
		const tr = tbody.createEl('tr', { cls: 'afm-loose' });
		const cell = tr.createEl('td');
		const title = cell.createDiv({ cls: 'afm-row-title' });
		const icon = title.createSpan({ cls: 'afm-chevron' });
		title.createSpan({ cls: 'afm-strong', text: x.name });
		const latest = x.rows.find((t) => t.amount < 0);
		if (latest) {
			// Opens the latest payment ready to name a subscription; it then finds the others by recipient and price.
			const setUp = title.createEl('button', { cls: 'afm-item-edit', text: 'Set up' });
			setTooltip(setUp, 'Make a subscription from these payments');
			setUp.addEventListener('click', (e) => {
				e.stopPropagation(); // don't toggle the row
				ctx.editCategory([latest], false, true);
			});
		}
		cell.createDiv({ cls: 'afm-muted afm-indent-chevron', text: latest ? `last ${formatMoney(-latest.amount, s)} · ${dayLabel(latest.date, s.locale)}` : '' });
		tr.createEl('td', { cls: 'afm-num', text: String(x.paid) });
		tr.createEl('td', { cls: 'afm-num afm-narrow-hide', text: x.month ? formatMoney(x.month, s) : '–' });
		tr.createEl('td', { cls: 'afm-num', text: formatMoney(x.total, s) });
		expandable(tr, icon, paymentRows(tbody, x.rows, ctx), `loose:${x.name}`, ctx.expanded);
	}

	// Totals: what the running ones cost a month, and everything spent on them.
	const foot = table.createEl('tfoot').createEl('tr');
	foot.createEl('td', { text: `Running ≈ ${formatMoney(monthlyCost(list), s)} a month` });
	foot.createEl('td');
	const all = [...list, ...loose];
	foot.createEl('td', { cls: 'afm-num afm-narrow-hide', text: formatMoney(sum(all.map((x) => x.month)), s) });
	foot.createEl('td', { cls: 'afm-num', text: formatMoney(sum(all.map((x) => x.total)), s) });
}

// Active / Cancel! / Cancelled, saved as soon as it changes.
function statusSelect(parent: HTMLElement, x: SubscriptionSummary, ctx: DashboardContext): void {
	const select = parent.createEl('select', { cls: `dropdown afm-status-select is-${x.sub.status || 'active'}` });
	for (const [value, text] of Object.entries(STATUS_LABELS)) select.createEl('option', { value, text });
	select.value = x.sub.status;
	select.addEventListener('click', (e) => e.stopPropagation()); // don't toggle the row
	select.addEventListener('keydown', (e) => e.stopPropagation());
	select.addEventListener('change', () => {
		x.sub.status = select.value as SubscriptionStatus;
		ctx.save();
	});
}

// One row per payment, newest first: description, date and account, which payment it was, amount.
function paymentRows(tbody: HTMLElement, rows: Transaction[], ctx: DashboardContext, sub?: Subscription): HTMLElement[] {
	const s = ctx.settings;
	if (rows.length === 0) {
		const tr = tbody.createEl('tr', { cls: 'afm-detail' });
		tr.createEl('td', { cls: 'afm-muted', text: 'No payments found yet. Check its text and amount in settings.', attr: { colspan: 4 } });
		return [tr];
	}
	return rows.map((t) => {
		const tr = tbody.createEl('tr', { cls: 'afm-detail' });
		tr.setCssProps({ '--afm-depth': '0' }); // under the name, no category icon here
		const cell = tr.createEl('td');
		rowName(cell, t, s);
		cell.createDiv({ cls: 'afm-muted', text: `${dayLabel(t.date, s.locale)} ${t.date.slice(0, 4)} · ${t.account}` });
		tr.createEl('td', { cls: 'afm-num afm-muted', text: t.amount > 0 ? 'Refund' : t.payment ? (sub?.payments ? `${t.payment}/${sub.payments}` : `#${t.payment}`) : '' });
		tr.createEl('td', { cls: 'afm-narrow-hide' });
		tr.createEl('td', { cls: 'afm-num', text: formatMoney(-t.amount, s) });
		tr.addEventListener('click', () => ctx.editCategory([t], false));
		return tr;
	});
}
