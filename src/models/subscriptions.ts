import { addDays, daysBetween } from '../utils/dates';
import type { FinanceSettings } from './FinanceSettings';
import { setLabel, type Labels } from './Labels';
import { guessPattern } from './guessCounterparty';
import { NO_SUBSCRIPTION, PERIOD_DAYS, type Period, type Subscription } from './Subscription';
import type { Transaction } from './Transaction';

// Matching payments to subscriptions, their totals, and adding / renaming / deleting subscriptions and types.

// True when a payment is with the subscription's counterparty, has its text and its amount (each only if set).
// A subscription with neither counterparty nor text matches nothing.
export function subscriptionMatches(s: Subscription, t: Transaction): boolean {
	const text = s.match.trim().toLowerCase();
	if (t.amount >= 0 || (!s.counterparty && !text)) return false;
	if (s.counterparty && t.counterparty !== s.counterparty) return false;
	if (s.amount !== null && Math.abs(-t.amount - s.amount) > 0.005) return false;
	return !text || t.description.toLowerCase().includes(text);
}

// Sets each row's subscription and payment number (rows oldest first). Set by hand wins; otherwise the subscription
// that matches (see subscriptionMatches), and when several do, the one whose last payment was about one period before.
export function linkSubscriptions(rows: Transaction[], labels: Labels): void {
	const byName = new Map(labels.subscriptions.map((s) => [s.name, s]));
	const last = new Map<string, string>(); // subscription -> date of its latest payment so far
	const count = new Map<string, number>();
	for (const t of rows) {
		const set = labels.transactions[t.id]?.subscription ?? '';
		const s = set === NO_SUBSCRIPTION ? undefined
			: byName.get(set) ?? closest(labels.subscriptions.filter((x) => subscriptionMatches(x, t)), t.date, last);
		t.subscription = s?.name ?? '';
		t.payment = 0;
		if (!s) continue;
		last.set(s.name, t.date);
		if (t.amount >= 0) continue; // refunds aren't numbered
		const n = (count.get(s.name) ?? s.paidBefore) + 1;
		count.set(s.name, n);
		t.payment = n;
	}
}

// Of several matching subscriptions, the one whose next payment was due nearest `date` (none yet = half a period off).
function closest(fits: Subscription[], date: string, last: Map<string, string>): Subscription | undefined {
	const off = (s: Subscription) => {
		const prev = last.get(s.name);
		return prev ? Math.abs(daysBetween(prev, date) - PERIOD_DAYS[s.period]) : PERIOD_DAYS[s.period] / 2;
	};
	return fits.reduce<Subscription | undefined>((best, s) => (!best || off(s) < off(best) ? s : best), undefined);
}

// One subscription's payments and totals.
export interface SubscriptionSummary {
	sub: Subscription;
	rows: Transaction[]; // payments and refunds, newest first
	price: number;       // cost of one payment (its amount, else the latest payment)
	total: number;       // spent so far, refunds taken off
	month: number;       // spent in the shown month
	paid: number;        // payments made, counting ones before your statements
	last: string;        // date of the latest payment, '' = none yet
	next: string;        // when the next one is due, '' = not expected (cancelled or all paid)
}

// Every subscription with its payments, in your order.
export function subscriptionSummaries(rows: Transaction[], labels: Labels, month: string, s: FinanceSettings): SubscriptionSummary[] {
	return labels.subscriptions.map((sub) => {
		const mine = rows.filter((t) => t.subscription === sub.name && t.currency === s.currency);
		const payments = mine.filter((t) => t.amount < 0);
		const latest = payments[payments.length - 1];
		const paid = Math.max(sub.paidBefore, ...payments.map((t) => t.payment));
		const done = sub.status === 'cancelled' || (sub.payments !== null && paid >= sub.payments);
		return {
			sub,
			rows: [...mine].reverse(),
			price: sub.amount ?? (latest ? -latest.amount : 0),
			total: -mine.reduce((a, t) => a + t.amount, 0),
			month: -mine.filter((t) => t.month === month).reduce((a, t) => a + t.amount, 0),
			paid,
			last: latest?.date ?? '',
			next: latest && !done ? addDays(latest.date, PERIOD_DAYS[sub.period]) : '',
		};
	});
}

// Roughly what the subscriptions still running cost a month.
export function monthlyCost(list: SubscriptionSummary[]): number {
	return list.filter((x) => x.next).reduce((a, x) => a + (x.price * PERIOD_DAYS.month) / PERIOD_DAYS[x.sub.period], 0);
}

// Spending that looks like a subscription without a name yet: the same merchant and amount in 3 or more months.
export interface Repeat {
	key: string;         // "TEXT|amount", what "Not a subscription" remembers
	description: string; // the merchant part of the description
	amount: number;      // cost of one payment
	months: number;
	rows: Transaction[];
}

// Unnamed repeats, most months first, except ones you hid.
export function unnamedRepeats(rows: Transaction[], s: FinanceSettings): Repeat[] {
	const groups = new Map<string, Transaction[]>();
	for (const t of rows) {
		if (t.subscription || t.amount >= 0 || t.kind !== 'spending' || t.currency !== s.currency) continue;
		const key = `${guessPattern(t.description)}|${t.amount.toFixed(2)}`;
		groups.set(key, [...(groups.get(key) ?? []), t]);
	}
	return [...groups]
		.map(([key, list]) => ({ key, description: guessPattern(list[0].description), amount: -list[0].amount, months: new Set(list.map((t) => t.month)).size, rows: list }))
		.filter((g) => g.months >= 3 && !s.hiddenRepeats.includes(g.key))
		.sort((a, b) => b.months - a.months || b.amount - a.amount);
}

// Guesses how often payments repeat from the average gap between them.
export function guessPeriod(rows: Transaction[]): Period {
	const dates = rows.map((t) => t.date).sort();
	if (dates.length < 2) return 'month';
	const gap = daysBetween(dates[0], dates[dates.length - 1]) / (dates.length - 1);
	const periods = Object.keys(PERIOD_DAYS) as Period[];
	return periods.reduce((best, p) => (Math.abs(PERIOD_DAYS[p] - gap) < Math.abs(PERIOD_DAYS[best] - gap) ? p : best), 'month');
}

// Adds a subscription unless one has that name.
export function addSubscription(labels: Labels, sub: Subscription): void {
	if (sub.name && !labels.subscriptions.some((x) => x.name === sub.name)) labels.subscriptions.push(sub);
}

// Renames a subscription, keeping payments you gave it by hand.
export function renameSubscription(labels: Labels, from: string, to: string): void {
	for (const s of labels.subscriptions) if (s.name === from) s.name = to;
	for (const l of Object.values(labels.transactions)) if (l.subscription === from) l.subscription = to;
}

// Deletes a subscription; payments you gave it by hand are matched automatically again.
export function deleteSubscription(labels: Labels, name: string): void {
	labels.subscriptions = labels.subscriptions.filter((s) => s.name !== name);
	for (const [id, l] of Object.entries(labels.transactions)) if (l.subscription === name) setLabel(labels, id, { subscription: '' });
}

// Renames a type, on its subscriptions too.
export function renameType(labels: Labels, from: string, to: string): void {
	for (const t of labels.types) if (t.name === from) t.name = to;
	for (const s of labels.subscriptions) if (s.type === from) s.type = to;
}

// Deletes a type; its subscriptions keep going without one.
export function deleteType(labels: Labels, name: string): void {
	labels.types = labels.types.filter((t) => t.name !== name);
	for (const s of labels.subscriptions) if (s.type === name) s.type = '';
}
