import type { CategoryKind } from './Category';
import type { FinanceSettings } from './FinanceSettings';

// The kind of a category, or null for Uncategorised / unknown names.
export function categoryKind(name: string, s: FinanceSettings): CategoryKind | null {
	return s.categories.find((c) => c.name === name)?.kind ?? null;
}
