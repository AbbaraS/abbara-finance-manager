import { uncategorised } from '../../models/uncategorised';
import type { DashboardContext } from '../DashboardContext';
import { section } from './section';
import { todo } from './todo';

// Lesson 3: uncategorised rows grouped by description, to turn into rules.
export function uncategorisedList(el: HTMLElement, ctx: DashboardContext): void {
	const groups = uncategorised(ctx.rows, ctx.month, ctx.settings);
	const body = section(el, 'Uncategorised');
	todo(body, 'Lesson 3 – uncategorised list', groups);
}
