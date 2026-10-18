import { daysInMonth } from '../utils/dates';
import type { FinanceSettings } from './FinanceSettings';
import { incomeOf, spendOf } from './rowKind';
import type { Transaction } from './Transaction';

// Net money on one day and the running total so far.
export interface DayPoint {
	day: number;
	net: number;     // income - spending that day
	running: number; // net from day 1 to this day
}

// Running net for each day, up to the last day that has data. Money back from a later month counts on its purchase's day.
export function dailyRunning(rows: Transaction[], month: string, s: FinanceSettings): DayPoint[] {
	const byDay = new Map<number, number>();
	for (const t of rows) {
		if (t.spendMonth !== month) continue;
		const net = incomeOf(t, s) - spendOf(t, s);
		const day = t.month === month ? t.day : t.refundOf?.day ?? t.day;
		if (net !== 0) byDay.set(day, (byDay.get(day) ?? 0) + net);
	}
	if (byDay.size === 0) return [];

	const lastDay = Math.min(Math.max(...byDay.keys()), daysInMonth(month));
	const points: DayPoint[] = [];
	let running = 0;
	for (let day = 1; day <= lastDay; day++) {
		const net = byDay.get(day) ?? 0;
		running += net;
		points.push({ day, net, running });
	}
	return points;
}
