import type { CategoryChoice } from './CategoryChoice';
import type { FinanceSettings } from './FinanceSettings';
import { leastUsedColor } from './migrateSettings';
import type { Rule } from './Rule';
import { ruleMatches } from './ruleMatches';
import { setDetails } from './setDetails';
import type { Transaction } from './Transaction';

// Saves a choice into settings: a new category if needed, a rule or one-off edits, then subcategory / note.
export function applyCategory(s: FinanceSettings, picked: Transaction[], c: CategoryChoice): void {
	const name = c.category.trim();
	const sub = c.subcategory.trim();
	if (!s.categories.some((x) => x.name === name)) {
		s.categories.push({ name, kind: c.newKind ?? 'spending', color: leastUsedColor(s), icon: '' });
	}

	// Category (and the rule's subcategory).
	const rule: Rule = { ...c.rule, pattern: c.rule.pattern.trim(), category: name, subcategory: sub };
	const byRule = (t: Transaction) => c.similar && ruleMatches(rule, t);
	if (c.similar) s.rules = [rule, ...s.rules.filter((r) => !sameMatch(r, rule))]; // new rule first, replacing a twin
	for (const t of picked) {
		if (byRule(t)) delete s.edits[t.key];                                   // the rule decides this row now
		else if (t.category !== name || t.source === 'edit') s.edits[t.key] = name; // only pin when it changes
	}

	// Per-row details. A rule's subcategory applies unless the row has its own.
	const isTransfer = s.categories.find((x) => x.name === name)?.kind === 'transfer';
	for (const t of picked) {
		setDetails(s, t.key, {
			sub: byRule(t) ? '' : sub,
			other: isTransfer ? c.other : '', // other account only means something for transfers
			...(picked.length === 1 ? { note: c.note } : {}),
		});
	}
}

// True when two rules match exactly the same rows.
function sameMatch(a: Rule, b: Rule): boolean {
	return a.pattern.trim().toLowerCase() === b.pattern.trim().toLowerCase()
		&& a.account === b.account && a.direction === b.direction;
}
