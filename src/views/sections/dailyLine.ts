import { dailyRunning } from '../../models/dailyRunning';
import type { DashboardContext } from '../DashboardContext';
import { section } from './section';
import { todo } from './todo';

// Lesson 6: running net through the month as an SVG line.
export function dailyLine(el: HTMLElement, ctx: DashboardContext): void {
	const points = dailyRunning(ctx.rows, ctx.month, ctx.settings);
	const body = section(el, 'Through the month');
	todo(body, 'Lesson 6 – daily line chart (SVG)', points);
}
