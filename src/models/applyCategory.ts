import type { CategoryChoice } from './CategoryChoice';
import type { FinanceSettings } from './FinanceSettings';
import type { Rule } from './Rule';
import { ruleMatches } from './ruleMatches';
import type { Transaction } from './Transaction';

// Saves a choice into settings: adds a new category if needed, then a rule or one-off edits.
export function applyCategory(s: FinanceSettings, picked: Transaction[], c: CategoryChoice): void {
	const name = c.category.trim();
	if (!s.categories.some((x) => x.name === name)) s.categories.push({ name, kind: c.newKind ?? 'spending' });

	if (!c.similar) {
		for (const t of picked) s.edits[t.key] = name;
		return;
	}

	const rule: Rule = { ...c.rule, pattern: c.rule.pattern.trim(), category: name };
	s.rules = [rule, ...s.rules.filter((r) => !sameMatch(r, rule))]; // new rule goes first, replacing a twin
	for (const t of picked) {
		if (ruleMatches(rule, t)) delete s.edits[t.key]; // the rule decides these now
		else s.edits[t.key] = name;                      // pattern was narrowed past this row
	}
}

// True when two rules match exactly the same rows.
function sameMatch(a: Rule, b: Rule): boolean {
	return a.pattern.trim().toLowerCase() === b.pattern.trim().toLowerCase()
		&& a.account === b.account && a.direction === b.direction;
}
