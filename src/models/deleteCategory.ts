import type { FinanceSettings } from './FinanceSettings';

// Removes a category with its rules and one-off edits; those rows fall back to other rules.
export function deleteCategory(s: FinanceSettings, name: string): void {
	s.categories = s.categories.filter((c) => c.name !== name);
	s.rules = s.rules.filter((r) => r.category !== name);
	for (const key in s.edits) if (s.edits[key] === name) delete s.edits[key];
}
