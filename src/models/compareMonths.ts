import { previousMonths } from '../utils/dates';
import type { FinanceSettings } from './FinanceSettings';
import { byCategory } from './groupSpending';
import type { Transaction } from './Transaction';

// How many earlier months make the average.
export const AVERAGE_MONTHS = 3;

// One category this month vs before.
export interface CategoryChange {
	category: string;
	thisMonth: number;
	lastMonth: number;
	average: number; // mean of the AVERAGE_MONTHS before this one
	change: number;  // thisMonth - lastMonth
	vsAverage: number | null; // 0.35 = 35% above average; null when there's no average
}

// Category spending compared with last month and the recent average.
export function compareMonths(rows: Transaction[], month: string, s: FinanceSettings): CategoryChange[] {
	const [last, ...rest] = previousMonths(month, AVERAGE_MONTHS);
	const totals = (m: string) => new Map(byCategory(rows, m, s).map((g) => [g.key, g.total]));
	const now = totals(month);
	const before = totals(last);
	const window = [last, ...rest].map(totals);

	const categories = new Set([...now.keys(), ...before.keys()]); // in either month
	const list = [...categories].map((category) => {
		const thisMonth = now.get(category) ?? 0;
		const lastMonth = before.get(category) ?? 0;
		const average = window.reduce((a, m) => a + (m.get(category) ?? 0), 0) / window.length;
		const vsAverage = average > 0 ? thisMonth / average - 1 : null;
		return { category, thisMonth, lastMonth, average, change: thisMonth - lastMonth, vsAverage };
	});
	return list.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
}
