import { addCategory, addSubcategory, findCategory } from './categories';
import { KEEP_SUBSCRIPTION, NEW_SUBSCRIPTION, type CategoryChoice } from './CategoryChoice';
import { setLabel, type Labels } from './Labels';
import { addPerson } from './people';
import type { Rule } from './Rule';
import { cleanPatterns, ruleMatches } from './ruleMatches';
import { addSubscription } from './subscriptions';
import type { Transaction } from './Transaction';

// Saves a choice into your labels: a new category, person, subcategory or subscription if needed, a merchant rule
// (new, or added to a saved one) or one-off categories, then subcategory, person, subscription, note and tags.
export function applyCategory(labels: Labels, picked: Transaction[], c: CategoryChoice): void {
	const name = c.category.trim();
	const sub = c.subcategory.trim();
	if (c.newKind) addCategory(labels, name, c.newKind);
	const kind = findCategory(labels, name)?.kind;
	const person = kind === 'people' ? c.person.trim() : '';
	addPerson(labels, person, name);
	addSubcategory(labels, name, sub, person);

	// Subscription: a new one is saved first.
	const n = c.newSubscription;
	if (c.subscription === NEW_SUBSCRIPTION) addSubscription(labels, { ...n, name: n.name.trim(), match: n.match.trim() });
	const subscription = c.subscription === NEW_SUBSCRIPTION ? n.name.trim() : c.subscription;

	// Category (and the rule's subcategory and person).
	const rule = c.similar ? ruleFor(labels, c, name, sub, person) : null;
	const byRule = (t: Transaction) => rule !== null && ruleMatches(rule, t);

	const one = picked.length === 1;
	for (const t of picked) {
		const ruled = byRule(t);
		// The rule decides now, or pin the category only when it changes.
		const category = ruled ? { category: '' } : t.category !== name || t.source === 'edit' ? { category: name } : {};
		const tags = one ? c.tags : [...new Set([...t.tags, ...c.tags])];
		setLabel(labels, t.id, {
			...category,
			sub: ruled && sub === (rule?.subcategory ?? '') ? '' : sub, // the rule's subcategory applies unless the row needs its own
			person: ruled && person === (rule?.person ?? '') ? '' : person,
			other: kind === 'transfer' ? c.other : '', // other account only means something for transfers
			tags,
			...(subscription === KEEP_SUBSCRIPTION ? {} : { subscription }),
			...(one ? { note: c.note } : {}),
		});
	}
}

// Adds the patterns to the chosen saved merchant, or saves a new one first in the list (replacing a twin).
function ruleFor(labels: Labels, c: CategoryChoice, name: string, sub: string, person: string): Rule {
	const patterns = cleanPatterns(c.rule.patterns);
	const a = c.addTo;
	if (a && labels.rules.includes(a) && a.category === name && (a.subcategory ?? '') === sub && (a.person ?? '') === person) {
		a.patterns = cleanPatterns([...a.patterns, ...patterns]);
		return a;
	}
	const rule: Rule = { ...c.rule, patterns, category: name, subcategory: sub, person };
	labels.rules = [rule, ...labels.rules.filter((r) => !sameMatch(r, rule))];
	return rule;
}

// True when two rules match exactly the same rows.
function sameMatch(a: Rule, b: Rule): boolean {
	const key = (r: Rule) => cleanPatterns(r.patterns).map((p) => p.toLowerCase()).sort().join('\n');
	return key(a) === key(b) && a.account === b.account && a.direction === b.direction;
}
