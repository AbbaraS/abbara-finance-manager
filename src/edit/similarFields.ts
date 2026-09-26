import { Setting } from 'obsidian';
import type { CategoryChoice } from '../models/CategoryChoice';
import { directionOf } from './directionOf';
import type { Transaction } from '../models/Transaction';
import { rulePreviewText } from './rulePreviewText';

// "Apply to similar" toggle, and the rule fields with a live match count when it's on.
export function similarFields(el: HTMLElement, c: CategoryChoice, picked: Transaction[], rows: Transaction[], redraw: () => void): void {
	new Setting(el)
		.setName('Apply to similar transactions')
		.setDesc('Saves a rule, so other months and new statements get this category too.')
		.addToggle((t) => t.setValue(c.similar).onChange((v) => { c.similar = v; redraw(); }));
	if (!c.similar) return;

	const preview = createDiv(); // filled below, placed after the fields
	const update = () => rulePreviewText(preview, c.rule, rows, picked);

	new Setting(el)
		.setName('Description contains')
		.setDesc('Any case. Shorten it to catch more, e.g. "AMAZON" instead of "AMAZON* 3V2No9C65".')
		.addText((t) => t.setValue(c.rule.pattern).onChange((v) => { c.rule.pattern = v; update(); }));

	// Only offered when every picked row shares the account / direction.
	const accounts = [...new Set(picked.map((t) => t.account))];
	if (accounts.length === 1) {
		new Setting(el).setName(`Only on ${accounts[0]}`).addToggle((t) => t.setValue(c.rule.account !== '')
			.onChange((v) => { c.rule.account = v ? accounts[0] : ''; update(); }));
	}
	const dir = directionOf(picked);
	if (dir) {
		new Setting(el).setName(`Only money ${dir}`).addToggle((t) => t.setValue(c.rule.direction !== '')
			.onChange((v) => { c.rule.direction = v ? dir : ''; update(); }));
	}

	el.appendChild(preview);
	update();
}
