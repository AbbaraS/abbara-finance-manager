import { addDays, daysBetween } from '../utils/dates';
import type { FinanceSettings } from './FinanceSettings';
import { setLabel, type Labels } from './Labels';
import { PERIOD_DAYS, type Period, type Subscription } from './Subscription';
import type { Transaction } from './Transaction';

// Subscription totals (payments are matched by Python), and adding / renaming / deleting subscriptions and types.

// One subscription's payments and totals.
export interface SubscriptionSummary {
	sub: Subscription;
	rows: Transaction[]; // payments and refunds, newest first
	price: number;       // cost of one payment (its amount, else the latest payment)
	total: number;       // spent so far, refunds taken off
	month: number;       // spent in the shown month
	paid: number;        // payments made, counting ones before your statements
	ended: boolean;      // cancelled by then: no payments after the shown month (Overall: cancelled)
	last: string;        // date of the latest payment, '' = none yet
	next: string;        // when the next one is due, '' = not expected (cancelled or all paid)
}

// Every subscription with its payments, in your order. upTo: only payments up to the shown month, and only
// subscriptions started by then; one cancelled later counts as running then.
export function subscriptionSummaries(rows: Transaction[], labels: Labels, month: string, s: FinanceSettings, upTo: boolean): SubscriptionSummary[] {
	return labels.subscriptions.flatMap((sub) => {
		const all = rows.filter((t) => t.subscription === sub.name && t.currency === s.currency);
		const mine = upTo ? all.filter((t) => t.month <= month) : all;
		if (upTo && mine.length === 0) return [];
		const payments = mine.filter((t) => t.amount < 0);
		const latest = payments[payments.length - 1];
		const paid = Math.max(sub.paidBefore, ...payments.map((t) => t.payment));
		const ended = sub.status === 'cancelled' && mine.length === all.length;
		const done = ended || (sub.payments !== null && paid >= sub.payments);
		return [{
			sub,
			rows: [...mine].reverse(),
			price: sub.amount ?? (latest ? -latest.amount : 0),
			total: -mine.reduce((a, t) => a + t.amount, 0),
			month: -mine.filter((t) => t.month === month).reduce((a, t) => a + t.amount, 0),
			paid,
			ended,
			last: latest?.date ?? '',
			next: latest && !done ? addDays(latest.date, PERIOD_DAYS[sub.period]) : '',
		}];
	});
}

// Roughly what the subscriptions still running cost a month.
export function monthlyCost(list: SubscriptionSummary[]): number {
	return list.filter((x) => x.next).reduce((a, x) => a + (x.price * PERIOD_DAYS.month) / PERIOD_DAYS[x.sub.period], 0);
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
