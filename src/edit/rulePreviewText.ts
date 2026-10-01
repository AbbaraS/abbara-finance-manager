import type { Rule } from '../models/Rule';
import { cleanPatterns, ruleMatches } from '../models/ruleMatches';
import { rulePreview } from '../models/rulePreview';
import type { Transaction } from '../models/Transaction';
import { countLabel } from '../utils/countLabel';

// How many example descriptions to show.
const EXAMPLES = 4;

// Fills `el` with what the rule would match, so a too-broad pattern is easy to spot.
export function rulePreviewText(el: HTMLElement, rule: Rule, rows: Transaction[], picked: Transaction[]): void {
	el.empty();
	el.addClass('afm-rule-preview');
	if (cleanPatterns(rule.patterns).length === 0) return void el.createDiv({ text: 'Type some text from the description.' });

	const p = rulePreview(rule, rows, picked);
	const months = countLabel(p.months, 'month');
	el.createDiv({ text: `Matches ${countLabel(p.count)} in ${months}.` });
	if (p.edited > 0) el.createDiv({ cls: 'afm-muted', text: `${countLabel(p.edited)} keep their one-off edit.` });

	const missed = picked.filter((t) => !ruleMatches(rule, t)).length;
	if (missed > 0) el.createDiv({ cls: 'mod-warning', text: `Doesn't match ${countLabel(missed)} you picked; they get a one-off edit instead.` });

	// A few different descriptions it would catch.
	const examples = [...new Set(rows.filter((t) => ruleMatches(rule, t)).map((t) => t.description))];
	if (examples.length > 1) {
		const more = examples.length > EXAMPLES ? ` and ${examples.length - EXAMPLES} more` : '';
		el.createDiv({ cls: 'afm-muted', text: `e.g. ${examples.slice(0, EXAMPLES).join(' · ')}${more}` });
	}
}
