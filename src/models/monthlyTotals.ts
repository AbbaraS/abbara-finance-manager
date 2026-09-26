import type { FinanceSettings } from './FinanceSettings';
import { monthList } from './monthList';
import { monthSummary } from './monthSummary';
import type { Transaction } from './Transaction';

// Income and spending for one month, for the bar chart.
export interface MonthTotal {
	month: string;
	income: number;
	spending: number;
}

// One entry per month, oldest first.
export function monthlyTotals(rows: Transaction[], s: FinanceSettings): MonthTotal[] {
	return monthList(rows).map((month) => {
		const { income, spending } = monthSummary(rows, month, s);
		return { month, income, spending };
	});
}
