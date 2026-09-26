import { monthlyTotals } from '../../models/monthlyTotals';
import type { DashboardContext } from '../DashboardContext';
import { section } from './section';
import { todo } from './todo';

// Lesson 5: income vs spending bars per month; click a month to open it.
export function monthlyBars(el: HTMLElement, ctx: DashboardContext): void {
	const totals = monthlyTotals(ctx.rows, ctx.settings);
	const body = section(el, 'Monthly overview');
	todo(body, 'Lesson 5 – monthly bar chart', totals.slice(-3));
}
