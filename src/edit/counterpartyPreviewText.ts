import type { Counterparty } from '../models/Counterparty';
import { cleanPatterns, counterpartyMatches } from '../models/counterpartyMatches';
import { counterpartyPreview } from '../models/counterpartyPreview';
import type { Transaction } from '../models/Transaction';
import { countLabel } from '../utils/countLabel';

// How many example descriptions to show.
const EXAMPLES = 4;

// Fills `el` with what the counterparty's spellings would find, so a too-broad one is easy to spot.
export function counterpartyPreviewText(el: HTMLElement, cp: Counterparty, rows: Transaction[], picked: Transaction[]): void {
	el.empty();
	el.addClass('afm-rule-preview');
	if (cleanPatterns(cp.patterns).length === 0) return void el.createDiv({ text: 'Type some text from the description.' });

	const p = counterpartyPreview(cp, rows, picked);
	const months = countLabel(p.months, 'month');
	el.createDiv({ text: `Finds ${countLabel(p.count)} in ${months}.` });
	if (p.edited > 0) el.createDiv({ cls: 'afm-muted', text: `${countLabel(p.edited)} keep their one-off edit.` });

	const missed = picked.filter((t) => !counterpartyMatches(cp, t)).length;
	if (missed > 0) el.createDiv({ cls: 'mod-warning', text: `Doesn't find ${countLabel(missed)} you picked; they're linked by hand and get a one-off edit instead.` });

	// A few different descriptions it would catch.
	const examples = [...new Set(rows.filter((t) => counterpartyMatches(cp, t)).map((t) => t.description))];
	if (examples.length > 1) {
		const more = examples.length > EXAMPLES ? ` and ${examples.length - EXAMPLES} more` : '';
		el.createDiv({ cls: 'afm-muted', text: `e.g. ${examples.slice(0, EXAMPLES).join(' · ')}${more}` });
	}
}
