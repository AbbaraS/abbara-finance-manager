import { compareMonths } from '../../models/compareMonths';
import type { DashboardContext } from '../DashboardContext';
import { section } from './section';
import { todo } from './todo';

// Lesson 4: each category vs last month and the recent average.
export function comparison(el: HTMLElement, ctx: DashboardContext): void {
	const changes = compareMonths(ctx.rows, ctx.month, ctx.settings);
	const body = section(el, 'Compared with last month');
	todo(body, 'Lesson 4 – comparison table', changes);
}
