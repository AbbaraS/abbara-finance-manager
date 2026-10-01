import { Setting } from 'obsidian';
import { findCategory } from '../models/categories';
import type { CategoryChoice } from '../models/CategoryChoice';
import type { Labels } from '../models/Labels';
import type { Rule } from '../models/Rule';
import { cleanPatterns } from '../models/ruleMatches';
import type { Transaction } from '../models/Transaction';
import { directionOf } from './directionOf';
import { rulePreviewText } from './rulePreviewText';

// "Remember for this merchant" toggle, and the rule fields with a live match count when it's on.
export function similarFields(el: HTMLElement, c: CategoryChoice, labels: Labels, picked: Transaction[], rows: Transaction[], redraw: () => void): void {
	new Setting(el)
		.setName('Remember for this merchant')
		.setDesc('Other months and new statements get this category too.')
		.addToggle((t) => t.setValue(c.similar).onChange((v) => { c.similar = v; redraw(); }));
	if (!c.similar) return;

	// Saved merchants with the same category, subcategory and person: the patterns can be added to one of them.
	const sub = c.subcategory.trim();
	const person = findCategory(labels, c.category.trim())?.kind === 'people' ? c.person.trim() : '';
	const same = labels.rules.filter((r) => r.category === c.category.trim() && (r.subcategory ?? '') === sub && (r.person ?? '') === person);
	if (c.addTo && !same.includes(c.addTo)) c.addTo = null;
	if (same.length > 0) {
		new Setting(el)
			.setName('Save as')
			.setDesc('Add spelling variations (UBER, UBR) to the merchant you already have.')
			.addDropdown((d) => {
				d.addOption('', 'New merchant');
				same.forEach((r, i) => d.addOption(String(i), `Add to: ${r.patterns.join(' / ')}`));
				d.setValue(c.addTo ? String(same.indexOf(c.addTo)) : '');
				d.onChange((v) => { c.addTo = v === '' ? null : same[Number(v)]; redraw(); });
			});
	}

	// What the preview checks: the chosen merchant with these patterns added, or the new rule.
	const preview = createDiv(); // filled below, placed after the fields
	const ruleNow = (): Rule => (c.addTo ? { ...c.addTo, patterns: cleanPatterns([...c.addTo.patterns, ...c.rule.patterns]) } : c.rule);
	const update = () => rulePreviewText(preview, ruleNow(), rows, picked);

	new Setting(el)
		.setName('Description contains')
		.setDesc('One per line; any of them matches. Any case. Shorten to catch more, e.g. "AMAZON" instead of "AMAZON* 3V2No9C65".')
		.addTextArea((t) => {
			t.setValue(c.rule.patterns.join('\n')).onChange((v) => { c.rule.patterns = v.split('\n'); update(); });
			t.inputEl.rows = Math.min(Math.max(c.rule.patterns.length, 2), 6);
		});

	// Only offered for a new merchant, when every picked row shares the account / direction.
	const accounts = [...new Set(picked.map((t) => t.account))];
	if (!c.addTo && accounts.length === 1) {
		new Setting(el).setName(`Only on ${accounts[0]}`).addToggle((t) => t.setValue(c.rule.account !== '')
			.onChange((v) => { c.rule.account = v ? accounts[0] : ''; update(); }));
	}
	const dir = directionOf(picked);
	if (!c.addTo && dir) {
		new Setting(el).setName(`Only money ${dir}`).addToggle((t) => t.setValue(c.rule.direction !== '')
			.onChange((v) => { c.rule.direction = v ? dir : ''; update(); }));
	}

	el.appendChild(preview);
	update();
}
