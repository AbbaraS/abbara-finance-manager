import type { FinanceSettings } from './FinanceSettings';
import { countsKind, incomeOf, spendOf } from './rowKind';
import type { Transaction } from './Transaction';

// Headline numbers for one month.
export interface MonthSummary {
	income: number;
	spending: number;
	net: number;            // income - spending
	count: number;          // rows counted
	otherCurrency: number;  // rows skipped for being in another currency
}

// Adds up one month's rows.
export function monthSummary(rows: Transaction[], month: string, s: FinanceSettings): MonthSummary {
	const inMonth = rows.filter((t) => t.month === month);
	const income = sum(inMonth.map((t) => incomeOf(t, s)));
	const spending = sum(inMonth.map((t) => spendOf(t, s)));
	const count = inMonth.filter((t) => incomeOf(t, s) !== 0 || spendOf(t, s) !== 0).length;
	const otherCurrency = inMonth.filter((t) => t.currency !== s.currency && countsKind(t)).length;
	return { income, spending, net: income - spending, count, otherCurrency };
}

// Sum of a list of numbers.
export function sum(values: number[]): number {
	return values.reduce((a, b) => a + b, 0);
}
