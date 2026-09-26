import type { FinanceSettings } from './FinanceSettings';

// Every category name from settings, A-Z.
export function categoryNames(s: FinanceSettings): string[] {
	return s.categories.map((c) => c.name).sort((a, b) => a.localeCompare(b));
}
