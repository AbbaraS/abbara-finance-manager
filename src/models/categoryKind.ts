import type { CategoryKind } from './Category';
import { findCategory } from './findCategory';

// The kind of a category, or null for Uncategorised / unknown names.
export function categoryKind(name: string): CategoryKind | null {
	return findCategory(name)?.kind ?? null;
}
