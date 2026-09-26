import type { FinanceSettings } from './FinanceSettings';
import { ruleMatches } from './ruleMatches';
import type { Transaction } from './Transaction';

// For each rule, how many rows it actually decides (first match wins, one-off edits skipped).
export function ruleHits(rows: Transaction[], s: FinanceSettings): number[] {
	const hits = s.rules.map(() => 0);
	for (const t of rows) {
		if (s.edits[t.key]) continue;
		const i = s.rules.findIndex((r) => ruleMatches(r, t));
		if (i >= 0) hits[i]++;
	}
	return hits;
}
