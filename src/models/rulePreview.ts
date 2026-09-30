import type { Rule } from './Rule';
import { ruleMatches } from './ruleMatches';
import type { Transaction } from './Transaction';

// What a new rule would touch.
export interface RulePreview {
	count: number;  // rows it matches
	months: number; // months those rows are in
	edited: number; // of those, rows with a one-off edit (they keep it)
}

// Counts the rows a rule matches. `picked` rows lose their edit, so they aren't counted as edited.
export function rulePreview(rule: Rule, rows: Transaction[], picked: Transaction[]): RulePreview {
	const pickedKeys = new Set(picked.map((t) => t.id));
	const hits = rows.filter((t) => ruleMatches(rule, t));
	return {
		count: hits.length,
		months: new Set(hits.map((t) => t.month)).size,
		edited: hits.filter((t) => t.source === 'edit' && !pickedKeys.has(t.id)).length,
	};
}
