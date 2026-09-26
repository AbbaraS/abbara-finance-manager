import { byCategory } from '../../models/groupSpending';
import type { DashboardContext } from '../DashboardContext';
import { section } from './section';
import { todo } from './todo';

// Lesson 2: spending per category; click a row to show its transactions.
export function categoryTable(el: HTMLElement, ctx: DashboardContext): void {
	const groups = byCategory(ctx.rows, ctx.month, ctx.settings);
	const body = section(el, 'Spending by category');
	todo(body, 'Lesson 2 – category table with drill-down', groups.map(({ rows, ...g }) => ({ ...g, rows: rows.length })));
}
