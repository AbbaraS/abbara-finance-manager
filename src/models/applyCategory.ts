import type { CategoryChoice } from './CategoryChoice';
import { categoryKind } from './categoryKind';
import type { Labels } from './Labels';
import type { Rule } from './Rule';
import { ruleMatches } from './ruleMatches';
import { setLabel } from './setLabel';
import type { Transaction } from './Transaction';

// Saves a choice into your labels: a merchant rule or one-off categories, then subcategory / note.
export function applyCategory(labels: Labels, picked: Transaction[], c: CategoryChoice): void {
	const name = c.category;
	const sub = c.subcategory.trim();
	const rule: Rule = { ...c.rule, pattern: c.rule.pattern.trim(), category: name, subcategory: sub };
	const byRule = (t: Transaction) => c.similar && ruleMatches(rule, t);
	if (c.similar) labels.rules = [rule, ...labels.rules.filter((r) => !sameMatch(r, rule))]; // new rule first, replacing a twin

	const isTransfer = categoryKind(name) === 'transfer';
	for (const t of picked) {
		const ruled = byRule(t);
		// Category: the rule decides now, or pin it only when it changes.
		const category = ruled ? { category: '' } : t.category !== name || t.source === 'edit' ? { category: name } : {};
		setLabel(labels, t.key, {
			...category,
			sub: ruled ? '' : sub, // a rule's subcategory applies unless the row has its own
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
