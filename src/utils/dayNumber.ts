// "2026-08-03" -> days since 1970, for date gaps.
export function dayNumber(date: string): number {
	const [y, m, d] = date.split('-').map(Number);
	return Date.UTC(y, m - 1, d) / 86_400_000;
}
