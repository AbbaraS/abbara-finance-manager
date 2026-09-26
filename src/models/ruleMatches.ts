import type { Rule } from './Rule';
import type { Transaction } from './Transaction';

// True when a rule applies to a transaction.
export function ruleMatches(rule: Rule, t: Transaction): boolean {
	const pattern = rule.pattern.trim().toLowerCase();
	if (!pattern) return false;
	if (rule.account && rule.account !== t.account) return false;
	if (rule.direction === 'in' && t.amount <= 0) return false;
	if (rule.direction === 'out' && t.amount >= 0) return false;
	return t.description.toLowerCase().includes(pattern);
}
