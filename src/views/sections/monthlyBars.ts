import { monthlyTotals } from '../../models/monthlyTotals';
import { monthWindow } from '../../utils/monthWindow';
import { niceScale } from '../../utils/niceScale';
import type { DashboardContext } from '../DashboardContext';
import { chartGrid } from './chartGrid';
import { chartLegend } from './chartLegend';
import { monthColumn } from './monthColumn';
import { section } from './section';

// Income vs spending for up to 12 months; click a month to open it.
export function monthlyBars(el: HTMLElement, ctx: DashboardContext): void {
	// Data: only the months in view, so the scale fits them.
	const shown = new Set(monthWindow(ctx.months, ctx.month));
	const totals = monthlyTotals(ctx.rows, ctx.settings).filter((t) => shown.has(t.month));
	const { max, step } = niceScale(Math.max(...totals.flatMap((t) => [t.income, t.spending])));

	// Chart.
	const body = section(el, 'Monthly overview');
	chartLegend(body, [{ label: 'Income', cls: 'afm-income' }, { label: 'Spending', cls: 'afm-spend' }]);
	const chart = body.createDiv({ cls: 'afm-chart' });
	chartGrid(chart, max, step, ctx.settings);
	const columns = chart.createDiv({ cls: 'afm-columns' });
	for (const t of totals) monthColumn(columns, t, max, ctx);
}
