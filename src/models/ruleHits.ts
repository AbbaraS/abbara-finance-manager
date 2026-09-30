import type { Labels } from './Labels';
import { ruleMatches } from './ruleMatches';
import type { Transaction } from './Transaction';

// For each rule, how many rows it actually decides (first match wins, one-off categories skipped).
export function ruleHits(rows: Transaction[], labels: Labels): number[] {
	const hits = labels.rules.map(() => 0);
	for (const t of rows) {
		if (labels.transactions[t.id]?.category) continue;
		const i = labels.rules.findIndex((r) => ruleMatches(r, t));
		if (i >= 0) hits[i]++;
	}
	return hits;
}
