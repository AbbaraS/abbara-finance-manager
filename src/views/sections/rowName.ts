import { setTooltip } from 'obsidian';
import { guessName, guessPattern } from '../../models/guessCounterparty';
import type { Transaction } from '../../models/Transaction';

// A transaction's name: the person (under People), its subscription, its counterparty, else a tidied description.
// The bank description shows on hover and in the edit window.
export function rowName(cell: HTMLElement, t: Transaction): void {
	const name = t.person || t.subscription || t.counterparty || guessName(guessPattern(t.description)) || t.description;
	setTooltip(cell.createDiv({ cls: 'afm-name', text: name }), t.description);
}
