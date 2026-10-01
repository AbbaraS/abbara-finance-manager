import type { Counterparty } from './Counterparty';
import type { Transaction } from './Transaction';

// True when a counterparty's patterns find a transaction: right account and direction, and any pattern is in the description.
export function counterpartyMatches(cp: Counterparty, t: Transaction): boolean {
	if (cp.account && cp.account !== t.account) return false;
	if (cp.direction === 'in' && t.amount <= 0) return false;
	if (cp.direction === 'out' && t.amount >= 0) return false;
	const text = t.description.toLowerCase();
	return cp.patterns.some((p) => p.trim() !== '' && text.includes(p.trim().toLowerCase()));
}

// Cleans a pattern list: trimmed, no blanks, no repeats (any case).
export function cleanPatterns(patterns: string[]): string[] {
	const seen = new Set<string>();
	return patterns.map((p) => p.trim()).filter((p) => p !== '' && !seen.has(p.toLowerCase()) && seen.add(p.toLowerCase()));
}
