import type { Labels } from './Labels';
import type { Transaction } from './Transaction';

// One entry in what you owe someone: added by hand (with a note), or one of your transactions marked as a debt.
// Saved in the Debt table, one ledger for both. `reason` keeps separate debts apart (Car, Shein, Tuition fees...).
export interface Debt {
	id?: number;         // database id, empty until first saved
	person: string;
	date: string;        // YYYY-MM-DD
	amount: number;      // + = you owe them more (borrowed), − = you paid some back
	note: string;
	reason: string;      // what it's for, e.g. "Car"; '' = none
	transaction: string; // transaction id; '' = added by hand
}

// One debt with a person: its entries (newest first) and what's borrowed, paid back and left.
export interface DebtGroup {
	reason: string;
	entries: Debt[];
	borrowed: number;
	paid: number; // positive
	left: number; // + = you still owe, − = they owe you
}

// Rounds to pennies, so sums like 0.1 + 0.2 settle at 0.
const pennies = (n: number) => Math.round(n * 100) / 100;

// A person's entries, newest first.
export function debtsOf(labels: Labels, person: string): Debt[] {
	return labels.debts.filter((d) => d.person === person).sort((a, b) => b.date.localeCompare(a.date) || (b.id ?? 1e9) - (a.id ?? 1e9));
}

// What you owe a person now (their entries added up, only for `reason` when given); negative = they owe you.
export function owed(labels: Labels, person: string, reason?: string): number {
	return pennies(labels.debts.filter((d) => d.person === person && (reason === undefined || d.reason === reason)).reduce((s, d) => s + d.amount, 0));
}

// A person's debts by reason: ones still open first (oldest first), paid-off ones last.
export function debtGroups(labels: Labels, person: string): DebtGroup[] {
	const groups = new Map<string, Debt[]>();
	for (const d of debtsOf(labels, person)) groups.set(d.reason, [...(groups.get(d.reason) ?? []), d]);
	const list = [...groups].map(([reason, entries]) => ({
		reason, entries,
		borrowed: pennies(entries.filter((d) => d.amount > 0).reduce((s, d) => s + d.amount, 0)),
		paid: pennies(-entries.filter((d) => d.amount < 0).reduce((s, d) => s + d.amount, 0)),
		left: pennies(entries.reduce((s, d) => s + d.amount, 0)),
	}));
	const first = (g: DebtGroup) => g.entries[g.entries.length - 1].date;
	return list.sort((a, b) => Number(a.left === 0) - Number(b.left === 0) || first(a).localeCompare(first(b)));
}

// Which debt a transaction goes towards when you don't pick one: its saved entry's, else (money out) the oldest debt
// you still owe that person, else none.
export function defaultReason(labels: Labels, t: Transaction, person: string): string {
	const own = labels.debts.find((d) => d.transaction === t.id);
	if (own && own.person === person) return own.reason;
	if (t.amount > 0) return '';
	return debtGroups(labels, person).find((g) => g.left > 0)?.reason ?? '';
}

// How much of a transaction counts towards a debt, signed like the transaction. Its saved entry if it has one for this
// person and debt; else money in counts in full, and money out pays back at most what's left of that debt (the rest stays in its subcategory).
export function debtShare(labels: Labels, t: Transaction, person: string, reason: string): number {
	const own = labels.debts.find((d) => d.transaction === t.id);
	if (own && own.person === person && own.reason === reason) return own.amount;
	if (t.amount > 0) return t.amount;
	const left = owed(labels, person, reason);
	return left > 0 ? -Math.min(-t.amount, left) : t.amount;
}

// Marks a transaction as a debt with `person` (money in = borrowed, money out = paying back), or unmarks it ('').
// `amount` is the part that counts (signed like the transaction), all of it by default. Keeps the entry's id and note.
export function markDebt(labels: Labels, t: Transaction, person: string, amount = t.amount, reason = ''): void {
	const i = labels.debts.findIndex((d) => d.transaction === t.id);
	if (!person) {
		if (i >= 0) labels.debts.splice(i, 1);
		return;
	}
	const entry = { person, date: t.date, amount, reason, transaction: t.id };
	if (i >= 0) Object.assign(labels.debts[i], entry);
	else labels.debts.push({ ...entry, note: '' });
}
