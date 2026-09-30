import { CATEGORIES } from '../defaults/categories';
import type { Category } from './Category';

// A fixed category by name; undefined for Uncategorised or unknown names.
export function findCategory(name: string): Category | undefined {
	return CATEGORIES.find((c) => c.name === name);
}
