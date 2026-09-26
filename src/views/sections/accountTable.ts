import { byAccount } from '../../models/groupSpending';
import type { DashboardContext } from '../DashboardContext';
import { section } from './section';
import { todo } from './todo';

// Lesson 1: spending per account as a table (account, amount, share bar).
export function accountTable(el: HTMLElement, ctx: DashboardContext): void {
	const groups = byAccount(ctx.rows, ctx.month, ctx.settings);
	const body = section(el, 'Spending by account');
	todo(body, 'Lesson 1 – account table', groups.map(({ rows, ...g }) => ({ ...g, rows: rows.length })));
}
