import { addCategory, findCategory } from './categories';
import type { CategoryChoice } from './CategoryChoice';
import { setLabel, type Labels } from './Labels';
import type { Rule } from './Rule';
import { cleanPatterns, ruleMatches } from './ruleMatches';
import type { Transaction } from './Transaction';

// Saves a choice into your labels: a new category if needed, a merchant rule (new, or added to a saved one)
// or one-off categories, then subcategory, note and tags.
export function applyCategory(labels: Labels, picked: Transaction[], c: CategoryChoice): void {
	const name = c.category.trim();
	const sub = c.subcategory.trim();
	if (c.newKind) addCategory(labels, name, c.newKind);

	// Category (and the rule's subcategory).
	const rule = c.similar ? ruleFor(labels, c, name, sub) : null;
	const byRule = (t: Transaction) => rule !== null && ruleMatches(rule, t);

	const isTransfer = findCategory(labels, name)?.kind === 'transfer';
	const one = picked.length === 1;
	for (const t of picked) {
		const ruled = byRule(t);
		// The rule decides now, or pin the category only when it changes.
		const category = ruled ? { category: '' } : t.category !== name || t.source === 'edit' ? { category: name } : {};
		const tags = one ? c.tags : [...new Set([...t.tags, ...c.tags])];
		setLabel(labels, t.id, {
			...category,
			sub: ruled && sub === (rule?.subcategory ?? '') ? '' : sub, // the rule's subcategory applies unless the row needs its own
			other: isTransfer ? c.other : '', // other account only means something for transfers
			tags,
			...(one ? { note: c.note } : {}),
		});
	}
}

// Adds the patterns to the chosen saved merchant, or saves a new one first in the list (replacing a twin).
function ruleFor(labels: Labels, c: CategoryChoice, name: string, sub: string): Rule {
	const patterns = cleanPatterns(c.rule.patterns);
	const a = c.addTo;
	if (a && labels.rules.includes(a) && a.category === name && (a.subcategory ?? '') === sub) {
		a.patterns = cleanPatterns([...a.patterns, ...patterns]);
		return a;
	}
	const rule: Rule = { ...c.rule, patterns, category: name, subcategory: sub };
	labels.rules = [rule, ...labels.rules.filter((r) => !sameMatch(r, rule))];
	return rule;
}

// True when two rules match exactly the same rows.
function sameMatch(a: Rule, b: Rule): boolean {
	const key = (r: Rule) => cleanPatterns(r.patterns).map((p) => p.toLowerCase()).sort().join('\n');
	return key(a) === key(b) && a.account === b.account && a.direction === b.direction;
}
