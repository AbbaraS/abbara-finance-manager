import type { FinanceSettings } from './FinanceSettings';

// Renames a category everywhere it's used (rules and one-off edits).
export function renameCategory(s: FinanceSettings, from: string, to: string): void {
	for (const c of s.categories) if (c.name === from) c.name = to;
	for (const r of s.rules) if (r.category === from) r.category = to;
	for (const key in s.edits) if (s.edits[key] === from) s.edits[key] = to;
}
