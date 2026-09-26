// "2026-09-14" -> "2026-09".
export function monthOf(date: string): string {
	return date.slice(0, 7);
}

// Number of days in a "YYYY-MM" month.
export function daysInMonth(month: string): number {
	const [y, m] = month.split('-').map(Number);
	return new Date(y, m, 0).getDate();
}

// The `count` months before `month`, newest first.
export function previousMonths(month: string, count: number): string[] {
	const [y, m] = month.split('-').map(Number);
	const list: string[] = [];
	for (let i = 1; i <= count; i++) {
		const d = new Date(y, m - 1 - i, 1);
		list.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
	}
	return list;
}

// "2026-09" -> "Sep 2026" (or "Sep 26" when short).
export function monthLabel(month: string, locale: string, short = false): string {
	const [y, m] = month.split('-').map(Number);
	const year = short ? '2-digit' : 'numeric';
	return new Date(y, m - 1, 1).toLocaleDateString(locale, { month: 'short', year });
}

// "2026-07-14" -> "14 Jul".
export function dayLabel(date: string, locale: string): string {
	const [y, m, d] = date.split('-').map(Number);
	return new Date(y, m - 1, d).toLocaleDateString(locale, { day: 'numeric', month: 'short' });
}

// True when `month` is this calendar month (so it isn't finished yet).
export function isCurrentMonth(month: string): boolean {
	const now = new Date();
	return month === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
