import { setTooltip } from 'obsidian';
import { guessName, guessPattern } from '../../models/guessCounterparty';
import type { FinanceSettings } from '../../models/FinanceSettings';
import type { Transaction } from '../../models/Transaction';

// A transaction's name: the person (under People), its subscription, its counterparty, else a tidied description.
// The bank description shows on hover and in the edit window. A recipient set to keep descriptions (Apple.com) shows the description itself.
export function rowName(cell: HTMLElement, t: Transaction, s: FinanceSettings): void {
	const described = !t.person && !t.subscription && s.describedRecipients.includes(t.counterparty);
	const name = described ? t.description : t.person || t.subscription || t.counterparty || guessName(guessPattern(t.description)) || t.description;
	setTooltip(cell.createDiv({ cls: 'afm-name', text: name }), t.description);
}
