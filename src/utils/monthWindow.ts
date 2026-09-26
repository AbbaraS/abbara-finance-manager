// Up to `size` months to show, always including `selected` (latest months when possible).
export function monthWindow(months: string[], selected: string, size = 12): string[] {
	const i = Math.max(months.indexOf(selected), 0);
	const after = i >= months.length - size ? months.length : i + 3; // keep a little after the selected month
	const end = Math.max(after, Math.min(size, months.length)); // early months: still show a full window
	return months.slice(Math.max(0, end - size), end);
}
