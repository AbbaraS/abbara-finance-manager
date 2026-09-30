import { addCategory, findCategory } from './categories';
import type { CategoryChoice } from './CategoryChoice';
import { setLabel, type Labels } from './Labels';
import type { Rule } from './Rule';
import { ruleMatches } from './ruleMatches';
import type { Transaction } from './Transaction';

// Saves a choice into your labels: a new category if needed, a merchant rule or one-off categories,
// then subcategory, note and tags.
export function applyCategory(labels: Labels, picked: Transaction[], c: CategoryChoice): void {
	const name = c.category.trim();
	const sub = c.subcategory.trim();
	if (c.newKind) addCategory(labels, name, c.newKind);

	// Category (and the rule's subcategory).
	const rule: Rule = { ...c.rule, pattern: c.rule.pattern.trim(), category: name, subcategory: sub };
	const byRule = (t: Transaction) => c.similar && ruleMatches(rule, t);
	if (c.similar) labels.rules = [rule, ...labels.rules.filter((r) => !sameMatch(r, rule))]; // new rule first, replacing a twin

	const isTransfer = findCategory(labels, name)?.kind === 'transfer';
	const one = picked.length === 1;
	for (const t of picked) {
		const ruled = byRule(t);
		// The rule decides now, or pin the category only when it changes.
		const category = ruled ? { category: '' } : t.category !== name || t.source === 'edit' ? { category: name } : {};
		const tags = one ? c.tags : [...new Set([...t.tags, ...c.tags])];
		setLabel(labels, t.id, {
			...category,
			sub: ruled ? '' : sub, // a rule's subcategory applies unless the row has its own
			other: isTransfer ? c.other : '', // other account only means something for transfers
			tags,
			...(one ? { note: c.note } : {}),
		});
	}
}

// True when two rules match exactly the same rows.
function sameMatch(a: Rule, b: Rule): boolean {
	return a.pattern.trim().toLowerCase() === b.pattern.trim().toLowerCase()
		&& a.account === b.account && a.direction === b.direction;
}
