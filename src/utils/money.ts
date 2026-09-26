import type { FinanceSettings } from '../models/FinanceSettings';

// Formats a number as money, e.g. "£1,234.50". Keeps the sign.
export function formatMoney(value: number, s: FinanceSettings): string {
	try {
		return value.toLocaleString(s.locale, { style: 'currency', currency: s.currency });
	} catch {
		return value.toFixed(2); // bad currency or locale in settings
	}
}

// Like formatMoney but always shows + or −, for changes.
export function formatChange(value: number, s: FinanceSettings): string {
	const sign = value > 0 ? '+' : value < 0 ? '−' : '';
	return sign + formatMoney(Math.abs(value), s);
}

// Short money for axis labels: 2500 -> "£2.5K".
export function formatCompact(value: number, s: FinanceSettings): string {
	try {
		return value.toLocaleString(s.locale, { style: 'currency', currency: s.currency, notation: 'compact', maximumFractionDigits: 1 });
	} catch {
		return String(Math.round(value));
	}
}
