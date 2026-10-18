import { monthlyTotals, type MonthTotal } from '../../models/monthlyTotals';
import { niceScale } from '../../utils/niceScale';
import type { DashboardContext } from '../DashboardContext';
import { chartGrid } from './chartGrid';
import { chartLegend } from './chartLegend';
import { monthColumn } from './monthColumn';

// Income vs spending for each month of the shown month's year (Jan to Dec, like the year tabs), so the chart only
// moves when the year changes. Click a month to open it; months without data are empty.
export function monthlyBars(body: HTMLElement, ctx: DashboardContext): void {
	// Data: the 12 months of the year, the scale fitted to them.
	const year = ctx.month.slice(0, 4);
	const byMonth = new Map(monthlyTotals(ctx.rows, ctx.settings).map((t) => [t.month, t]));
	const totals: MonthTotal[] = Array.from({ length: 12 }, (_, i) => {
		const month = `${year}-${String(i + 1).padStart(2, '0')}`;
		return byMonth.get(month) ?? { month, income: 0, spending: 0 };
	});
	const { max, step } = niceScale(Math.max(1, ...totals.flatMap((t) => [t.income, t.spending])));

	// Chart.
	body.createDiv({ cls: 'afm-caption', text: `Each month of ${year}: money in from income vs money spent. Click a month to open it.` });
	chartLegend(body, [{ label: 'Income', cls: 'afm-income' }, { label: 'Spending', cls: 'afm-spend' }]);
	const chart = body.createDiv({ cls: 'afm-chart' });
	chartGrid(chart, max, step, ctx.settings);
	const columns = chart.createDiv({ cls: 'afm-columns' });
	for (const t of totals) monthColumn(columns, t, max, ctx, ctx.months.includes(t.month));
}
