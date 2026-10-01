import { Setting } from 'obsidian';
import { KEEP_COUNTERPARTY, type CategoryChoice } from '../models/CategoryChoice';
import { findCategory } from '../models/categories';
import { findCounterparty } from '../models/counterparties';
import type { Counterparty } from '../models/Counterparty';
import { cleanPatterns, counterpartyMatches, textMatches } from '../models/counterpartyMatches';
import { countLabel } from '../utils/countLabel';
import type { Labels } from '../models/Labels';
import type { Transaction } from '../models/Transaction';
import { counterpartyPreviewText } from './counterpartyPreviewText';
import { directionOf } from './directionOf';

// "Remember for this counterparty" toggle and its fields, with a live count when it's on.
// When it's off, a counterparty can be picked by hand for rows its spellings don't find.
export function similarFields(el: HTMLElement, c: CategoryChoice, labels: Labels, picked: Transaction[], rows: Transaction[], redraw: () => void): void {
	if (findCategory(labels, c.category.trim())?.kind === 'people') return personFields(el, c, labels, rows, redraw);
	const names = labels.counterparties.map((x) => x.name).sort((a, b) => a.localeCompare(b));
	new Setting(el)
		.setName('Remember for this counterparty')
		.setDesc('Saves who this is (e.g. Uber), so other months and new statements get the same name and category.')
		.addToggle((t) => t.setValue(c.similar).onChange((v) => { c.similar = v; redraw(); }));

	// Off: pick by hand.
	if (!c.similar) {
		if (names.length === 0) return;
		const found = picked.length === 1 ? labels.counterparties.find((x) => counterpartyMatches(x, picked[0]))?.name : '';
		new Setting(el)
			.setName('Counterparty')
			.setDesc('Only needed when its spellings don\'t find this transaction.')
			.addDropdown((d) => {
				if (picked.length > 1) d.addOption(KEEP_COUNTERPARTY, 'Leave as it is');
				d.addOption('', found ? `Found by spellings: ${found}` : 'None (found by spellings)');
				for (const n of names) d.addOption(n, n);
				d.setValue(c.counterparty).onChange((v) => (c.counterparty = v));
			});
		return;
	}

	// On: a new counterparty, or add the spellings to a saved one.
	if (c.addTo && !labels.counterparties.includes(c.addTo)) c.addTo = null;
	const moves = c.addTo?.category && c.addTo.category !== c.category.trim();
	new Setting(el)
		.setName('Save as')
		.setDesc(moves ? `${c.addTo!.name} is in ${c.addTo!.category} now; it moves to ${c.category.trim() || 'the category above'}.`
			: 'Add spellings (UBER, UBR) to a counterparty you already have, or make a new one.')
		.addDropdown((d) => {
			d.addOption('', 'New counterparty');
			for (const n of names) d.addOption(n, `Add to ${n}`);
			d.setValue(c.addTo?.name ?? '');
			d.onChange((v) => { c.addTo = v ? findCounterparty(labels, v) ?? null : null; redraw(); });
		});
	if (!c.addTo) {
		new Setting(el).setName('Name').setDesc('Shown instead of the description.')
			.addText((t) => t.setPlaceholder('e.g. Uber').setValue(c.draft.name).onChange((v) => (c.draft.name = v)));
	}

	// What the preview checks: the saved counterparty with these spellings added, or the new one.
	const preview = createDiv(); // filled below, placed after the fields
	const now = (): Counterparty => (c.addTo ? { ...c.addTo, patterns: cleanPatterns([...c.addTo.patterns, ...c.draft.patterns]) } : c.draft);
	const update = () => counterpartyPreviewText(preview, now(), rows, picked);

	new Setting(el)
		.setName('Description contains')
		.setDesc('One per line; any of them matches. Any case. Shorten to catch more, e.g. "AMAZON" instead of "AMAZON* 3V2No9C65".')
		.addTextArea((t) => {
			t.setValue(c.draft.patterns.join('\n')).onChange((v) => { c.draft.patterns = v.split('\n'); update(); });
			t.inputEl.rows = Math.min(Math.max(c.draft.patterns.length, 2), 6);
		});

	// Only offered for a new counterparty, when every picked row shares the account / direction.
	const accounts = [...new Set(picked.map((t) => t.account))];
	if (!c.addTo && accounts.length === 1) {
		new Setting(el).setName(`Only on ${accounts[0]}`).addToggle((t) => t.setValue(c.draft.account !== '')
			.onChange((v) => { c.draft.account = v ? accounts[0] : ''; update(); }));
	}
	const dir = directionOf(picked);
	if (!c.addTo && dir) {
		new Setting(el).setName(`Only money ${dir}`).addToggle((t) => t.setValue(c.draft.direction !== '')
			.onChange((v) => { c.draft.direction = v ? dir : ''; update(); }));
	}

	el.appendChild(preview);
	update();
}

// Under People: "Remember for this person" saves spellings on the person (not a counterparty), with a live count.
function personFields(el: HTMLElement, c: CategoryChoice, labels: Labels, rows: Transaction[], redraw: () => void): void {
	const person = c.person.trim();
	new Setting(el)
		.setName('Remember for this person')
		.setDesc(person ? `Saves these spellings on ${person}, so their other transfers are found too.` : 'Pick the person above first.')
		.addToggle((t) => t.setValue(c.similar).onChange((v) => { c.similar = v; redraw(); }));
	if (!c.similar) return;

	const preview = createDiv({ cls: 'afm-rule-preview' });
	const update = () => {
		const all = cleanPatterns([...(labels.people.find((p) => p.name === person)?.patterns ?? []), ...c.personPatterns]);
		const hits = rows.filter((t) => textMatches(all, t.description));
		preview.setText(all.length ? `Finds ${countLabel(hits.length)} in ${countLabel(new Set(hits.map((t) => t.month)).size, 'month')}.` : 'Type some text from the description.');
	};
	new Setting(el)
		.setName('Description contains')
		.setDesc('One per line; any of them matches. Just the name finds money both ways, e.g. "MARIANA SULEYMAN DALI".')
		.addTextArea((t) => {
			t.setValue(c.personPatterns.join('\n')).onChange((v) => { c.personPatterns = v.split('\n'); update(); });
			t.inputEl.rows = Math.min(Math.max(c.personPatterns.length, 2), 6);
		});
	el.appendChild(preview);
	update();
}
