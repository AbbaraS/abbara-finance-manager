import type { Rule } from './Rule';
import type { Transaction } from './Transaction';

// True when a rule applies to a transaction: right account and direction, and any pattern is in the description.
export function ruleMatches(rule: Rule, t: Transaction): boolean {
	if (rule.account && rule.account !== t.account) return false;
	if (rule.direction === 'in' && t.amount <= 0) return false;
	if (rule.direction === 'out' && t.amount >= 0) return false;
	const text = t.description.toLowerCase();
	return rule.patterns.some((p) => p.trim() !== '' && text.includes(p.trim().toLowerCase()));
}

// Cleans a pattern list: trimmed, no blanks, no repeats (any case).
export function cleanPatterns(patterns: string[]): string[] {
	const seen = new Set<string>();
	return patterns.map((p) => p.trim()).filter((p) => p !== '' && !seen.has(p.toLowerCase()) && seen.add(p.toLowerCase()));
}
